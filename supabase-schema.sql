-- ============================================================
-- COMPLYFLEET — Supabase Database Schema
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES (soft-delete with archived_at)
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  o_licence TEXT,
  operating_centre TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  authorised_vehicles INTEGER DEFAULT 0,
  authorised_trailers INTEGER DEFAULT 0,
  licence_status TEXT DEFAULT 'Valid',
  licence_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- COMPANY CONTACTS
-- ============================================================
CREATE TABLE company_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES (soft-delete with archived_at)
-- ============================================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  reg TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('HGV', 'Van', 'Trailer')),
  make TEXT,
  model TEXT,
  year INTEGER,
  mot_due DATE,
  pmi_due DATE,
  insurance_due DATE,
  tacho_due DATE,
  service_due DATE,
  pmi_interval INTEGER DEFAULT 6,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- DEFECTS (NO delete — only status changes: open → in_progress → resolved → closed)
-- ============================================================
CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES vehicles(id),
  company_id UUID REFERENCES companies(id),
  vehicle_reg TEXT NOT NULL,
  vehicle_type TEXT,
  company_name TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'dangerous')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_by TEXT,
  reported_date DATE DEFAULT CURRENT_DATE,
  assigned_to TEXT,
  resolved_date DATE,
  resolved_by TEXT,
  closed_date DATE,
  check_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEFECT NOTES (activity timeline)
-- ============================================================
CREATE TABLE defect_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defect_id UUID REFERENCES defects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WALKAROUND CHECKS
-- ============================================================
CREATE TABLE walkaround_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES vehicles(id),
  company_id UUID REFERENCES companies(id),
  vehicle_reg TEXT NOT NULL,
  vehicle_type TEXT,
  driver_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  defects_reported INTEGER DEFAULT 0,
  odometer TEXT,
  driver_signature TEXT,
  reference_id TEXT UNIQUE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHECK ITEMS (individual pass/fail per checklist item)
-- ============================================================
CREATE TABLE check_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_id UUID REFERENCES walkaround_checks(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  defect_description TEXT,
  defect_severity TEXT CHECK (defect_severity IN ('minor', 'major', 'dangerous')),
  photo_url TEXT
);

-- ============================================================
-- MAGIC LINKS
-- ============================================================
CREATE TABLE magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_reg TEXT NOT NULL,
  vehicle_type TEXT,
  company_name TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  sent_to TEXT,
  sent_via TEXT CHECK (sent_via IN ('sms', 'whatsapp', 'email', 'copy')),
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER defects_updated_at BEFORE UPDATE ON defects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-EXPIRE MAGIC LINKS (run periodically or use Supabase cron)
-- ============================================================
CREATE OR REPLACE FUNCTION expire_magic_links()
RETURNS void AS $$
BEGIN
  UPDATE magic_links SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (basic — enable later for multi-tenant)
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkaround_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_items ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (tighten later with auth)
CREATE POLICY "Allow all" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON defects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON walkaround_checks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON magic_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON company_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON defect_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON check_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA (your test companies)
-- ============================================================
INSERT INTO companies (name, o_licence, operating_centre, address, phone, email, authorised_vehicles, authorised_trailers, licence_status, licence_expiry) VALUES
  ('Hargreaves Haulage Ltd', 'OB1234567', 'Unit 4, Leeds Industrial Estate, LS9 8AB', '12 Commercial Road, Leeds, LS1 4AP', '0113 496 2100', 'office@hargreaves-haulage.co.uk', 8, 4, 'Valid', '2027-08-15'),
  ('Northern Express Transport', 'OB2345678', 'Wakefield Commercial Depot, WF1 2AB', '45 Westgate, Wakefield, WF1 1JY', '01924 331 200', 'ops@northern-express.co.uk', 6, 2, 'Valid', '2028-03-20'),
  ('Yorkshire Fleet Services', 'OB3456789', 'Bradford Business Park, BD4 7TJ', '8 Manor Row, Bradford, BD1 4PB', '01274 882 400', 'fleet@yorkshirefleet.co.uk', 10, 6, 'Valid', '2027-11-30'),
  ('Pennine Logistics Group', 'OB4567890', 'Huddersfield Trade Park, HD1 6QF', '22 Market Street, Huddersfield, HD1 2EN', '01484 510 300', 'ops@penninelogistics.co.uk', 4, 2, 'Valid', '2028-06-10');

-- Get company IDs for vehicle inserts
DO $$
DECLARE
  c1 UUID; c2 UUID; c3 UUID; c4 UUID;
BEGIN
  SELECT id INTO c1 FROM companies WHERE o_licence = 'OB1234567';
  SELECT id INTO c2 FROM companies WHERE o_licence = 'OB2345678';
  SELECT id INTO c3 FROM companies WHERE o_licence = 'OB3456789';
  SELECT id INTO c4 FROM companies WHERE o_licence = 'OB4567890';

  -- Hargreaves vehicles
  INSERT INTO vehicles (company_id, reg, type, make, model, year, mot_due, pmi_due, insurance_due, tacho_due, service_due, pmi_interval) VALUES
    (c1, 'BD63 XYZ', 'HGV', 'DAF', 'CF 330', 2020, '2026-02-18', '2026-02-14', '2026-06-15', '2026-09-01', '2026-03-20', 6),
    (c1, 'KL19 ABC', 'HGV', 'DAF', 'LF 230', 2019, '2026-05-22', '2026-02-20', '2026-08-30', '2026-07-15', '2026-04-10', 6),
    (c1, 'MN20 DEF', 'Van', 'Ford', 'Transit 350', 2020, '2026-07-11', '2026-03-28', '2026-11-05', NULL, '2026-05-15', 8),
    (c1, 'PQ21 GHI', 'Trailer', 'SDC', 'Curtainsider', 2021, '2026-04-30', '2026-03-01', '2026-12-01', NULL, NULL, 6);

  -- Northern Express vehicles
  INSERT INTO vehicles (company_id, reg, type, make, model, year, mot_due, pmi_due, insurance_due, tacho_due, service_due, pmi_interval) VALUES
    (c2, 'AB12 CDE', 'HGV', 'Volvo', 'FH 460', 2022, '2026-02-19', '2026-03-05', '2026-05-20', '2026-10-12', '2026-04-22', 6),
    (c2, 'FG34 HIJ', 'HGV', 'Scania', 'R450', 2021, '2026-06-14', '2026-02-21', '2026-09-18', '2026-08-03', '2026-05-30', 6),
    (c2, 'JK56 LMN', 'Van', 'Mercedes', 'Sprinter 314', 2022, '2026-08-25', '2026-04-10', '2026-07-22', NULL, '2026-06-01', 10);

  -- Yorkshire Fleet vehicles
  INSERT INTO vehicles (company_id, reg, type, make, model, year, mot_due, pmi_due, insurance_due, tacho_due, service_due, pmi_interval) VALUES
    (c3, 'LM67 OPQ', 'HGV', 'DAF', 'XF 480', 2020, '2026-03-15', '2026-02-10', '2026-04-28', '2026-06-20', '2026-03-25', 6),
    (c3, 'RS89 TUV', 'HGV', 'Volvo', 'FM 330', 2019, '2026-09-30', '2026-03-22', '2026-11-15', '2026-12-01', '2026-07-18', 6),
    (c3, 'WX01 YZA', 'Van', 'VW', 'Crafter', 2021, '2026-10-20', '2026-04-05', '2026-08-10', NULL, '2026-06-22', 8),
    (c3, 'BC23 DEF', 'Trailer', 'Montracon', 'Flatbed', 2020, '2026-05-18', '2026-03-10', '2026-10-05', NULL, NULL, 6),
    (c3, 'GH45 IJK', 'HGV', 'Scania', 'R450', 2019, '2026-02-12', '2026-02-28', '2026-06-30', '2026-07-25', '2026-04-15', 6);

  -- Pennine vehicles
  INSERT INTO vehicles (company_id, reg, type, make, model, year, mot_due, pmi_due, insurance_due, tacho_due, service_due, pmi_interval) VALUES
    (c4, 'LN54 BCD', 'HGV', 'MAN', 'TGX 18.470', 2021, '2026-08-10', '2026-04-20', '2026-09-25', '2026-11-10', '2026-06-05', 6),
    (c4, 'OP67 EFG', 'Van', 'Ford', 'Transit Custom', 2022, '2026-11-30', '2026-05-01', '2026-12-20', NULL, '2026-07-28', 10);

  -- Contacts
  INSERT INTO company_contacts (company_id, name, role, phone, email, is_primary) VALUES
    (c1, 'Ian Hargreaves', 'Director / O-Licence Holder', '07700 900123', 'ian@hargreaves-haulage.co.uk', TRUE),
    (c1, 'Julie Hargreaves', 'Office Manager', '07700 900124', 'julie@hargreaves-haulage.co.uk', FALSE),
    (c1, 'Dave Pearson', 'Workshop Foreman', '07700 900125', 'dave@hargreaves-haulage.co.uk', FALSE),
    (c2, 'Sarah Mitchell', 'Managing Director', '07700 900456', 'sarah@northern-express.co.uk', TRUE),
    (c2, 'Tom Bennett', 'Transport Clerk', '07700 900457', 'tom@northern-express.co.uk', FALSE),
    (c3, 'David Brooks', 'Owner / Director', '07700 900789', 'david@yorkshirefleet.co.uk', TRUE),
    (c3, 'Gary Firth', 'Yard Manager', '07700 900791', 'gary@yorkshirefleet.co.uk', FALSE),
    (c4, 'Karen Whitfield', 'Director', '07700 900321', 'karen@penninelogistics.co.uk', TRUE);

  -- Sample defects
  INSERT INTO defects (vehicle_reg, vehicle_type, company_name, company_id, category, description, severity, status, reported_by, reported_date) VALUES
    ('BD63 XYZ', 'HGV', 'Hargreaves Haulage Ltd', c1, 'Brakes', 'Nearside brake pad worn below limit', 'dangerous', 'open', 'Mark Thompson', '2026-02-15'),
    ('GH45 IJK', 'HGV', 'Yorkshire Fleet Services', c3, 'MOT', 'MOT expired — vehicle must not be used on public roads', 'dangerous', 'in_progress', 'Steve Williams', '2026-02-13'),
    ('LM67 OPQ', 'HGV', 'Yorkshire Fleet Services', c3, 'Lights', 'Offside indicator intermittent', 'minor', 'open', 'Steve Williams', '2026-02-14');
END $$;
