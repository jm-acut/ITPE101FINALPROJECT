import { randomUUID } from "node:crypto";

export default function requestId(req, res, next) {
    req.id = randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
}