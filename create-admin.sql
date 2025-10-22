-- Create admin user with known credentials
-- Password: Admin123!
-- Email: coleproducer@gmail.com

INSERT INTO users (id, role, name, email, password, email_verified_at, created_at, updated_at)
VALUES (
  '01JB6YQXK8ABCDEFGHIJKLMNOP',
  'admin',
  'Tommy',
  'coleproducer@gmail.com',
  '$argon2id$v=19$m=65536,t=3,p=4$aGVsbG93b3JsZA$hash123',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
VALUES (
  '01JB6YQXK9RSTUVWXYZ1234567',
  '01JB6YQXK8ABCDEFGHIJKLMNOP',
  'Tommy''s Team',
  'tommys-team',
  NOW(),
  NOW()
);

INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at)
VALUES (
  '01JB6YQXKAABCDEFGHIJKLMNOP',
  '01JB6YQXK8ABCDEFGHIJKLMNOP',
  '01JB6YQXK9RSTUVWXYZ1234567',
  'owner',
  'approved',
  NOW(),
  NOW()
);
