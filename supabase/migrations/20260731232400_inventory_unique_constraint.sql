-- Agregar restricción UNIQUE en (modelo, numero_vivienda) a la tabla inventory
ALTER TABLE inventory ADD CONSTRAINT inventory_modelo_numero_vivienda_key UNIQUE (modelo, numero_vivienda);
