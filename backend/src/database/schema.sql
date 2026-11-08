CREATE TABLE users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,

    role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'admin', 'staff')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE theaters (
    theater_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    description TEXT,
    image_url TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
    room_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    theater_id INTEGER NOT NULL REFERENCES theaters(theater_id),
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (theater_id, name),
    UNIQUE (room_id, theater_id)
);

CREATE TABLE seats (
    seat_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    room_id INTEGER NOT NULL REFERENCES rooms(room_id),

    row_number INTEGER NOT NULL,
    seat_number INTEGER NOT NULL,
    display_order INTEGER NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    CHECK (row_number > 0 AND row_number <> 13),
    CHECK (seat_number > 0 AND seat_number <> 13),
    CHECK (display_order BETWEEN 1 AND 10),

    UNIQUE (room_id, seat_number),
    UNIQUE (room_id, row_number, display_order),
    UNIQUE (seat_id, room_id)
);

CREATE TABLE wheelchair_spaces (
    wheelchair_space_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    room_id INTEGER NOT NULL REFERENCES rooms(room_id),

    space_number INTEGER NOT NULL
        CHECK (space_number BETWEEN 1 AND 10),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    UNIQUE (room_id, space_number),
    UNIQUE (wheelchair_space_id, room_id)
);

CREATE TABLE movies (
    movie_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL CHECK (duration > 0),

    director VARCHAR(150),
    cast_members TEXT,
    language VARCHAR(100),
    age_rating VARCHAR(20),

    genre TEXT[],
    subtitles TEXT[],

    poster_url TEXT,
    trailer_url TEXT,

    release_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'coming_soon'
        CHECK (status IN ('coming_soon', 'now_showing', 'ended')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE showtimes (
    showtime_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    movie_id INTEGER NOT NULL REFERENCES movies(movie_id),
    room_id INTEGER NOT NULL REFERENCES rooms(room_id),

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'cancelled', 'completed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (end_time > start_time),
    UNIQUE (showtime_id, room_id)
);
CREATE INDEX idx_showtimes_movie
ON showtimes(movie_id);

CREATE INDEX idx_showtimes_room_start
ON showtimes(room_id, start_time);

CREATE TABLE pricing_policies (
    policy_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    adjustment_type VARCHAR(20) NOT NULL
        CHECK (adjustment_type IN ('surcharge', 'discount')),

    adjustment_percentage NUMERIC(5,2) NOT NULL
        CHECK (adjustment_percentage BETWEEN 0 AND 100),

    scope VARCHAR(30) NOT NULL DEFAULT 'all_theaters'
        CHECK (scope IN ('all_theaters', 'specific_theater')),

    theater_id INTEGER REFERENCES theaters(theater_id),

    conditions JSONB NOT NULL DEFAULT '{}'::JSONB,

    priority INTEGER NOT NULL DEFAULT 1,

    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        (scope = 'all_theaters' AND theater_id IS NULL)
        OR
        (scope = 'specific_theater' AND theater_id IS NOT NULL)
    ),

    CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date)
);

CREATE TABLE reservations (
    reservation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER REFERENCES users(user_id),

    showtime_id INTEGER NOT NULL REFERENCES showtimes(showtime_id),

    customer_email VARCHAR(255) NOT NULL,

    booking_method VARCHAR(20) NOT NULL
        CHECK (booking_method IN ('online', 'counter')),

    payment_method VARCHAR(20)
        CHECK (payment_method IN ('online', 'at_counter')),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'cancelled', 'converted')),

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (NOW() + INTERVAL '10 minutes'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (reservation_id, showtime_id)
);

CREATE INDEX idx_reservations_user
ON reservations(user_id);

CREATE TABLE bookings (
    booking_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    reservation_id INTEGER NOT NULL UNIQUE
        REFERENCES reservations(reservation_id),

    booking_code VARCHAR(50) NOT NULL UNIQUE,

    total_amount NUMERIC(10,2) NOT NULL
        CHECK (total_amount >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),

    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_status
ON bookings(status);

CREATE TABLE showtime_seat_allocations (
    allocation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    showtime_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,

    seat_id INTEGER,
    wheelchair_space_id INTEGER,

    reservation_id INTEGER,
    booking_id INTEGER,

    status VARCHAR(20) NOT NULL DEFAULT 'held'
        CHECK (status IN ('held', 'booked', 'released')),

    base_price NUMERIC(10,2),
    final_price NUMERIC(10,2),

    applied_policies JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMPTZ,

    CHECK (
        (seat_id IS NOT NULL AND wheelchair_space_id IS NULL)
        OR
        (seat_id IS NULL AND wheelchair_space_id IS NOT NULL)
    ),
    CHECK (
        (base_price IS NULL OR base_price >= 0)
        AND
        (final_price IS NULL OR final_price >= 0)
    ),
    CHECK (
        (
            status = 'held'
            AND reservation_id IS NOT NULL
            AND expires_at IS NOT NULL
            AND booking_id IS NULL
        )
        OR
        (
            status = 'booked'
            AND reservation_id IS NOT NULL
            AND booking_id IS NOT NULL
            AND base_price IS NOT NULL
            AND final_price IS NOT NULL
        )
        OR
        (
            status = 'released'
            AND reservation_id IS NULL
            AND booking_id IS NULL
            AND expires_at IS NULL
        )
    ),
    FOREIGN KEY (showtime_id, room_id)
        REFERENCES showtimes(showtime_id, room_id),

    FOREIGN KEY (seat_id, room_id)
        REFERENCES seats(seat_id, room_id),

    FOREIGN KEY (wheelchair_space_id, room_id)
        REFERENCES wheelchair_spaces(wheelchair_space_id, room_id),

    FOREIGN KEY (reservation_id, showtime_id)
        REFERENCES reservations(reservation_id, showtime_id),

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id),
    UNIQUE (allocation_id, booking_id)
);

CREATE UNIQUE INDEX uq_showtime_seat
ON showtime_seat_allocations(showtime_id, seat_id)
WHERE seat_id IS NOT NULL;

CREATE UNIQUE INDEX uq_showtime_wheelchair
ON showtime_seat_allocations(showtime_id, wheelchair_space_id)
WHERE wheelchair_space_id IS NOT NULL;

CREATE INDEX idx_allocations_reservation
ON showtime_seat_allocations(reservation_id);
CREATE INDEX idx_allocations_booking
ON showtime_seat_allocations(booking_id);

CREATE TABLE payments (
    payment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    booking_id INTEGER NOT NULL REFERENCES bookings(booking_id),

    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),

    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('online', 'at_counter')),

    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),

    transaction_code VARCHAR(255) UNIQUE,

    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking
ON payments(booking_id);

CREATE TABLE tickets (
    ticket_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    booking_id INTEGER NOT NULL,

    allocation_id INTEGER NOT NULL,

    ticket_code VARCHAR(100) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (allocation_id),

    FOREIGN KEY (allocation_id, booking_id)
        REFERENCES showtime_seat_allocations(allocation_id, booking_id)
);

CREATE INDEX idx_tickets_booking
ON tickets(booking_id);

CREATE TABLE corporate_bookings (
    corporate_booking_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER REFERENCES users(user_id),

    contact_email VARCHAR(255) NOT NULL,

    organization_name VARCHAR(255) NOT NULL,

    theater_id INTEGER NOT NULL ,

    room_id INTEGER,

    movie_id INTEGER REFERENCES movies(movie_id),

    expected_people INTEGER NOT NULL
        CHECK (expected_people > 0),

    preferred_start_time TIMESTAMPTZ,

    message TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),

    admin_note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (room_id, theater_id)
    REFERENCES rooms(room_id, theater_id)
);

CREATE INDEX idx_corporate_bookings_status
ON corporate_bookings(status);

CREATE INDEX idx_corporate_bookings_user
ON corporate_bookings(user_id);