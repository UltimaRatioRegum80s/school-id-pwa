-- PSS behavior categories: production apply script
-- Idempotent. Run against the PRODUCTION database (Database tool → Production SQL console).
-- Safe to re-run: existing categories (same school, name, type) are skipped, and the
-- 3 generic placeholder demerits are removed only when not referenced by behavior logs.
--
-- SCOPE: this only touches the school the admin account belongs to. The target
-- is resolved from schools that have an admin user (role = 'admin'). If you run
-- multiple schools in production and want to pin one explicitly, replace the
-- target_school CTE body with: SELECT id FROM schools WHERE code = 'DEMO';

BEGIN;

-- 1. Insert merit + PSS demerit categories for the admin's school only,
--    skipping any that already exist with the same (school_id, name, type).
WITH target_school AS (
  SELECT DISTINCT u.school_id AS id
  FROM users u
  WHERE u.role = 'admin'
),
desired(name, type, points, description) AS (
  VALUES
    ('Academic Excellence', 'merit', 5, 'Outstanding academic performance'),
    ('Good Citizenship', 'merit', 3, 'Helping others and community'),
    ('Punctuality', 'merit', 2, 'Always on time'),
    ('S1 Late for school / Not punctual', 'demerit', 1, 'Disciplinary — S1'),
    ('S1 Absent without permission', 'demerit', 1, 'Disciplinary — S1'),
    ('S1 Disruptive / Disrespectful / Unacceptable behaviour', 'demerit', 1, 'Disciplinary — S1'),
    ('S2 Disruptive / Disrespectful / Unacceptable behaviour', 'demerit', 2, 'Disciplinary — S2'),
    ('S1 Swearing / Foul language / Lying / Disobedient', 'demerit', 1, 'Disciplinary — S1'),
    ('S1 Uncooperative during teaching period', 'demerit', 1, 'Disciplinary — S1'),
    ('S1 Unauthorised electronic device (immediate confiscation)', 'demerit', 1, 'Disciplinary — S1'),
    ('S2 Bullying / Mobbing', 'demerit', 2, 'Disciplinary — S2'),
    ('S2 Vandalism / Stealing', 'demerit', 2, 'Disciplinary — S2'),
    ('S2 Copying work / signature', 'demerit', 2, 'Disciplinary — S2'),
    ('S2 Possession of tobacco / smoking', 'demerit', 2, 'Disciplinary — S2'),
    ('S3 Vandalism / Stealing', 'demerit', 3, 'Disciplinary — S3'),
    ('S1 Late for class', 'demerit', 1, 'Disciplinary — S1'),
    ('S2 Homework Not Done', 'demerit', 2, 'Disciplinary — S2'),
    ('S3 Cheating', 'demerit', 3, 'Disciplinary — S3'),
    ('S1 Eating in Computer Class', 'demerit', 1, 'Disciplinary — S1'),
    ('Homework not done', 'demerit', 1, 'Academic'),
    ('Homework not finished', 'demerit', 1, 'Academic'),
    ('Books left at home', 'demerit', 1, 'Academic'),
    ('Alternative activities during teaching time', 'demerit', 1, 'Academic'),
    ('Stay away from sport activity - no or late excuse', 'demerit', 1, 'Academic'),
    ('Not attending class', 'demerit', 1, 'Academic'),
    ('Cheating during a test', 'demerit', 1, 'Academic'),
    ('Phone in class', 'demerit', 1, 'Academic')
)
INSERT INTO behavior_categories (school_id, name, type, points, description)
SELECT s.id, d.name, d.type, d.points, d.description
FROM schools s
JOIN target_school ts ON ts.id = s.id
CROSS JOIN desired d
WHERE NOT EXISTS (
  SELECT 1 FROM behavior_categories bc
  WHERE bc.school_id = s.id
    AND bc.name = d.name
    AND bc.type = d.type
);

-- 2. Remove the 3 generic placeholder demerits in the admin's school only, and
--    only if no behavior log references them.
DELETE FROM behavior_categories bc
WHERE bc.type = 'demerit'
  AND bc.name IN ('Late Arrival', 'Uniform Violation', 'Disruptive Behavior')
  AND bc.school_id IN (SELECT DISTINCT u.school_id FROM users u WHERE u.role = 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM behavior_logs bl WHERE bl.category_id = bc.id
  );

COMMIT;
