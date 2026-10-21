-- Renombra los valores del enum Role a inglés (consistencia de nombres).
ALTER TYPE "Role" RENAME VALUE 'gerente' TO 'manager';
ALTER TYPE "Role" RENAME VALUE 'cajera' TO 'cashier';
