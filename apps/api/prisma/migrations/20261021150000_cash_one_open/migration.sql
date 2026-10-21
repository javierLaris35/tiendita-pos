-- Un cajero tiene a lo más un turno abierto a la vez (índice único parcial).
CREATE UNIQUE INDEX "CashSession_one_open_per_cashier" ON "CashSession" ("cashierId") WHERE "status" = 'open';
