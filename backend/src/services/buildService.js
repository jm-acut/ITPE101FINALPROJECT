import { randomBytes } from "node:crypto";
import AppError from "../utils/AppError.js";
import { productRepository } from "../repositories/productRepository.js";
import { buildRepository } from "../repositories/buildRepository.js";
import { cartRepository } from "../repositories/cartRepository.js";
import { toProductDto } from "./productService.js";
import { checkBuild } from "../patterns/compatibility/compatibilityEngine.js";

const MAX_BUILDS_PER_USER = 20;
const MAX_QTY = 99;

// Loads current product data from the database. Prices and stock are never taken from the client.
async function loadParts(partIds, { strict = true } = {}) {
    const unique = [...new Set(partIds)];
    const rows = await productRepository.findByIds(unique);
    const available = new Map(rows.filter((r) => r.is_active).map((r) => [r.id, toProductDto(r)]));
    const missing = unique.filter((id) => !available.has(id));

    if (strict && missing.length > 0) {
        throw AppError.validation([{ in: "body", field: "partIds", message: "One or more parts do not exist or are no longer sold." }]);
    }
    return { parts: partIds.filter((id) => available.has(id)).map((id) => available.get(id)), missing };
}

function evaluate(parts, missing = []) {
    const result = checkBuild(parts);
    if (missing.length > 0) {
        result.issues.unshift({
            code: "PART_UNAVAILABLE",
            severity: "error",
            message: `${missing.length} part(s) in this build are no longer sold.`,
            partIds: missing
        });
        result.compatible = false;
    }
    return { ...result, parts };
}

const toBuildDto = (row, evaluation) => ({
    id: row.id,
    name: row.name,
    partIds: row.part_ids,
    shareCode: row.share_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...evaluation
});

// Someone else's build looks exactly like a missing one (404).
async function loadOwned(userId, id) {
    const row = await buildRepository.findById(id);
    if (!row || row.user_id !== userId) throw AppError.notFound("Build not found.", "BUILD_NOT_FOUND");
    return row;
}

export const buildService = {
    // Public: anyone can check a list of parts.
    async check(partIds) {
        const { parts } = await loadParts(partIds);
        return evaluate(parts);
    },

    async list(userId) {
        const rows = await buildRepository.listByUser(userId);

        // One product query for all builds
        const allIds = [...new Set(rows.flatMap((r) => r.part_ids))];
        const found = await productRepository.findByIds(allIds);
        const available = new Map(found.filter((r) => r.is_active).map((r) => [r.id, toProductDto(r)]));

        return rows.map((row) => {
            const parts = row.part_ids.filter((id) => available.has(id)).map((id) => available.get(id));
            const missing = [...new Set(row.part_ids)].filter((id) => !available.has(id));
            return toBuildDto(row, evaluate(parts, missing));
        });
    },

    async get(userId, id) {
        const row = await loadOwned(userId, id);
        const { parts, missing } = await loadParts(row.part_ids, { strict: false });
        return toBuildDto(row, evaluate(parts, missing));
    },

    async create(userId, { name, partIds }) {
        if ((await buildRepository.countByUser(userId)) >= MAX_BUILDS_PER_USER) {
            throw AppError.conflict(`You can save at most ${MAX_BUILDS_PER_USER} builds. Delete one first.`, "BUILD_LIMIT");
        }
        const { parts } = await loadParts(partIds); // only real, sold products can be saved
        const row = await buildRepository.create({ userId, name, partIds });
        return toBuildDto(row, evaluate(parts));
    },

    async update(userId, id, body) {
        await loadOwned(userId, id);

        const patch = {};
        if (body.name !== undefined) patch.name = body.name;
        if (body.partIds !== undefined) {
            await loadParts(body.partIds);
            patch.part_ids = body.partIds;
        }
        const row = await buildRepository.update(id, patch);
        const { parts, missing } = await loadParts(row.part_ids, { strict: false });
        return toBuildDto(row, evaluate(parts, missing));
    },

    async remove(userId, id) {
        await loadOwned(userId, id);
        await buildRepository.remove(id);
    },

    async share(userId, id) {
        const row = await loadOwned(userId, id);
        let code = row.share_code;

        for (let attempt = 0; !code && attempt < 3; attempt += 1) {
            const candidate = randomBytes(8).toString("base64url"); // 11 URL-safe characters
            try {
                await buildRepository.setShareCode(id, candidate);
                code = candidate;
            } catch (error) {
                if (error?.code !== "23505") throw error; // unique clash: try another code
            }
        }
        if (!code) throw AppError.conflict("Could not create a share link. Try again.", "SHARE_FAILED");
        return { shareCode: code };
    },

    async unshare(userId, id) {
        await loadOwned(userId, id);
        await buildRepository.setShareCode(id, null);
    },

    // Public read-only view. It never exposes who owns the build, and prices and stock are always live.
    async getShared(code) {
        const row = await buildRepository.findByShareCode(code);
        if (!row) throw AppError.notFound("This shared build does not exist or is no longer shared.", "SHARE_NOT_FOUND");

        const { parts, missing } = await loadParts(row.part_ids, { strict: false });
        return { name: row.name, createdAt: row.created_at, ...evaluate(parts, missing) };
    },

    // BUSINESS RULE: only a compatible build with enough stock can go into the cart, and all-or-nothing.
    async addToCart(userId, id) {
        const row = await loadOwned(userId, id);
        const { parts, missing } = await loadParts(row.part_ids, { strict: false });
        const evaluation = evaluate(parts, missing);

        if (!evaluation.compatible) {
            throw new AppError(
                409,
                "BUILD_INCOMPATIBLE",
                "This build has compatibility problems, so it cannot be added to the cart.",
                evaluation.issues.filter((i) => i.severity === "error")
            );
        }

        const cart = await cartRepository.getOrCreate(userId);
        const inCart = new Map(
            (await cartRepository.getItems(cart.id)).filter((i) => i.product).map((i) => [i.product.id, i.quantity])
        );

        // A build can hold two memory kits, so the same product may be needed twice.
        const needed = new Map();
        for (const part of parts) needed.set(part.id, (needed.get(part.id) ?? 0) + 1);

        const problems = [];
        for (const [productId, qty] of needed) {
            const part = parts.find((p) => p.id === productId);
            const total = (inCart.get(productId) ?? 0) + qty;
            if (total > part.stock) {
                problems.push({ field: productId, message: `${part.name}: only ${part.stock} in stock, but your cart would have ${total}.` });
            } else if (total > MAX_QTY) {
                problems.push({ field: productId, message: `${part.name}: you can buy at most ${MAX_QTY} of one item.` });
            }
        }
        if (problems.length > 0) {
            throw new AppError(409, "INSUFFICIENT_STOCK", "Some parts do not have enough stock.", problems);
        }

        for (const [productId, qty] of needed) {
            await cartRepository.setItem(cart.id, productId, (inCart.get(productId) ?? 0) + qty);
        }
        return { addedProducts: needed.size, addedUnits: parts.length };
    }
};