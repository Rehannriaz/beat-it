-- Initial database setup
-- This file runs automatically when the PostgreSQL container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Songs table: stores uploaded songs and their pattern data
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    duration DECIMAL(10, 2),
    bpm INTEGER,
    difficulty VARCHAR(50) DEFAULT 'medium',
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    pattern JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster pattern queries
CREATE INDEX IF NOT EXISTS idx_songs_difficulty ON songs(difficulty);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);
