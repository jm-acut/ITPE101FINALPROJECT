import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import AppError from "../utils/AppError.js";
import { userRepository } from "../repositories/userRepository.js";

const BCRYPT_ROUNDS = 12;
// Lets a login for an unknown email take as long as a real one (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const toPublicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.created_at });

function signToken(user) {
    return jwt.sign({ role: user.role }, env.JWT_SECRET, {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN,
        algorithm: "HS256"
    });
}

export const authService = {
    async register({ name, email, password }) {
        const existing = await userRepository.findByEmail(email);
        if (existing) throw AppError.conflict("An account with this email already exists.", "EMAIL_TAKEN");

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        try {
            const user = await userRepository.create({ name, email, passwordHash });
            return { user: toPublicUser(user), token: signToken(user) };
        } catch (error) {
            // Two simultaneous sign-ups: the database unique constraint is the real guard.
            if (error?.code === "23505") {
                throw AppError.conflict("An account with this email already exists.", "EMAIL_TAKEN");
            }
            throw error;
        }
    },

    async login({ email, password }) {
        const user = await userRepository.findByEmail(email);
        const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

        if (!user || !valid) {
            // Generic on purpose: do not reveal which part was wrong.
            throw AppError.unauthorized("Invalid email or password.", "INVALID_CREDENTIALS");
        }

        return { user: toPublicUser(user), token: signToken(user) };
    },

    async me(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw AppError.unauthorized("Account no longer exists.", "INVALID_TOKEN");
        return toPublicUser(user);
    }
};