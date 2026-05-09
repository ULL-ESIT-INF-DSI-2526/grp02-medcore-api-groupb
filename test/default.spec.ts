import { describe, test, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("Rutas inexistentes (defaultRouter)", () => {
  test("Debería devolver 404 al acceder a una ruta que no existe", async () => {
    const response = await request(app).get("/ruta-inventada-123").expect(404);
    expect(response.body.error).toContain("no existe");
  });
});