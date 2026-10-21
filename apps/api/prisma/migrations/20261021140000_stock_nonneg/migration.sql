-- Evita stock negativo a nivel de base de datos (defensa independiente de la app).
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonneg" CHECK (stock >= 0);
