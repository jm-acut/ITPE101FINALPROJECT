import { categoryRepository } from "../repositories/categoryRepository.js";

export const categoryService = {
    list: () => categoryRepository.findAll()
};