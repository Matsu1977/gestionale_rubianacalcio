ALTER TABLE public.abbonamenti 
ADD COLUMN tipo_pagamento text NOT NULL DEFAULT 'Pagamento unico',
ADD COLUMN data_inizio date NOT NULL DEFAULT CURRENT_DATE;