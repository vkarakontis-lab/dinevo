-- 0003_ratings.sql — star ratings shown on cards, profiles and JSON-LD.
-- Set by the platform admin (e.g. imported Google rating) via SQL or the
-- service role; there is deliberately no public write path and no dashboard
-- field, so owners can't inflate their own stars.
alter table restaurants
  add column if not exists rating numeric(2,1)
    check (rating is null or (rating >= 0 and rating <= 5)),
  add column if not exists review_count int not null default 0;
