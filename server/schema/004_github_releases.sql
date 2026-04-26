-- 004_github_releases.sql — auto-update infrastructure for Kassa-backed
-- listings (and any other plugin) sourced from a GitHub repo's Releases.
--
-- Sellers attach a `github_repo` ("owner/name") to their listing. A cron
-- job polls /repos/:owner/:repo/releases/latest every 15 minutes; when
-- `tag_name` changes we update `current_version` + emit a marketplace
-- event so the bot can DM owners.
--
-- Buyers store their installed_version locally (per-device, see dist
-- localStorage). The My Library UI compares listing.current_version vs
-- localStorage and surfaces an Update button when they diverge.

ALTER TABLE listings ADD COLUMN github_repo TEXT;
ALTER TABLE listings ADD COLUMN github_token TEXT;
ALTER TABLE listings ADD COLUMN current_version TEXT;
ALTER TABLE listings ADD COLUMN current_version_url TEXT;
ALTER TABLE listings ADD COLUMN current_version_notes TEXT;
ALTER TABLE listings ADD COLUMN current_version_published_at INTEGER;
ALTER TABLE listings ADD COLUMN github_last_polled_at INTEGER;
ALTER TABLE listings ADD COLUMN github_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_github_poll
  ON listings(github_last_polled_at) WHERE github_repo IS NOT NULL;
