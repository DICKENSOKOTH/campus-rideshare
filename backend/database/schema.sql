-- ============================================================
-- RideU — Database Schema
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. Users
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL        PRIMARY KEY,
    full_name     VARCHAR(150)     NOT NULL,
    email         VARCHAR(254)     NOT NULL UNIQUE,
    phone         VARCHAR(20)      NOT NULL UNIQUE,
    password_hash VARCHAR(255)     NOT NULL,
    role          VARCHAR(20)      NOT NULL DEFAULT 'rider',
    avatar_url    VARCHAR(500)     DEFAULT NULL,
    is_active     BOOLEAN          NOT NULL DEFAULT TRUE,
    is_verified   BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 2. Driver Profiles
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_profiles (
    id               BIGSERIAL       PRIMARY KEY,
    user_id          BIGINT          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number   VARCHAR(50)     NOT NULL UNIQUE,
    vehicle_make     VARCHAR(80)     NOT NULL,
    vehicle_model    VARCHAR(80)     NOT NULL,
    vehicle_year     INTEGER         NOT NULL,
    vehicle_plate    VARCHAR(20)     NOT NULL UNIQUE,
    vehicle_color    VARCHAR(40)     NOT NULL,
    seats_available  SMALLINT        NOT NULL DEFAULT 3,
    is_approved      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 3. Rides
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
    id                BIGSERIAL       PRIMARY KEY,
    driver_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin            VARCHAR(255)    NOT NULL,
    destination       VARCHAR(255)    NOT NULL,
    origin_lat        DECIMAL(9,6)    NOT NULL,
    origin_lng        DECIMAL(9,6)    NOT NULL,
    destination_lat   DECIMAL(9,6)    NOT NULL,
    destination_lng   DECIMAL(9,6)    NOT NULL,
    departure_time    TIMESTAMP       NOT NULL,
    seats_total       SMALLINT        NOT NULL DEFAULT 3,
    seats_remaining   SMALLINT        NOT NULL DEFAULT 3,
    price_per_seat    DECIMAL(8,2)    NOT NULL DEFAULT 0.00,
    status            VARCHAR(20)     NOT NULL DEFAULT 'scheduled',
    notes             TEXT            DEFAULT NULL,
    created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 4. Bookings
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id           BIGSERIAL      PRIMARY KEY,
    ride_id      BIGINT         NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    rider_id     BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_booked SMALLINT       NOT NULL DEFAULT 1,
    status       VARCHAR(20)    NOT NULL DEFAULT 'pending',
    booked_at    TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE (ride_id, rider_id)
);

-- ──────────────────────────────────────────────
-- 5. Ratings
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
    id          BIGSERIAL    PRIMARY KEY,
    booking_id  BIGINT       NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    rater_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score       SMALLINT     NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment     TEXT         DEFAULT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 6. Refresh Tokens
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         BIGSERIAL     PRIMARY KEY,
    user_id    BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(512)  NOT NULL UNIQUE,
    expires_at TIMESTAMP     NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 7. AI Chat History
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id         BIGSERIAL     PRIMARY KEY,
    user_id    BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20)   NOT NULL,
    content    TEXT          NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 8. Notifications
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGSERIAL     PRIMARY KEY,
    user_id    BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(200)  NOT NULL,
    message    TEXT          NOT NULL,
    is_read    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);