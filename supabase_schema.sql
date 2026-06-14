-- =====================================================================
-- SOCIALSPHERE PRO: COMPREHENSIVE SUPABASE PostgreSQL SCHEMA
-- TYPE: Analytics, Reporting & Professional Hub (Secondary Relational Database)
-- PRIMARY BACKEND: Firebase (Auth, Feeds, Chat, Real-Time Media and Interactions)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS SETUP
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- High-performance text searching

-- ---------------------------------------------------------------------
-- 2. CUSTOM TYPES & ENUMS
-- ---------------------------------------------------------------------
CREATE TYPE rls_role_enum AS ENUM ('member', 'admin', 'owner');
CREATE TYPE job_type_enum AS ENUM ('full_time', 'part_time', 'contract', 'freelance', 'internship');
CREATE TYPE application_status_enum AS ENUM ('applied', 'screening', 'interviewing', 'offered', 'rejected');
CREATE TYPE event_location_enum AS ENUM ('online', 'in_person', 'hybrid');
CREATE TYPE rsvp_status_enum AS ENUM ('going', 'maybe', 'declined');
CREATE TYPE license_type_enum AS ENUM ('basic_mp3', 'premium_wav', 'exclusive', 'unlimited_lease');
CREATE TYPE vote_type_enum AS ENUM ('upvote', 'downvote');
CREATE TYPE order_status_enum AS ENUM ('pending', 'completed', 'refunded', 'failed');
CREATE TYPE task_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_status_enum AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE system_admin_role_enum AS ENUM ('moderator', 'admin', 'super_admin');
CREATE TYPE moderation_action_enum AS ENUM ('none', 'warn', 'shadowban', 'suspend', 'delete');

-- ---------------------------------------------------------------------
-- 3. CORE TABLES (IDENTITY & PORTFOLIO INTEGRATION)
-- ---------------------------------------------------------------------

-- Public profile layer mapped to auth.users (Supabase native Auth integration)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(120),
    website TEXT,
    level VARCHAR(50) DEFAULT 'Beginner'::text,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_xp_positive CHECK (xp >= 0)
);

CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_skills (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    years_experience NUMERIC(3,1) CHECK (years_experience >= 0),
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    role VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_dates CHECK (end_date IS NULL OR start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS public.education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution VARCHAR(150) NOT NULL,
    degree VARCHAR(100),
    field_of_study VARCHAR(120),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_edu_dates CHECK (end_date IS NULL OR start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    issuing_organization VARCHAR(150) NOT NULL,
    issue_date DATE,
    expiration_date DATE,
    credential_id VARCHAR(100),
    credential_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.portfolio_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    project_url TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.social_links (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'github', 'linkedin', 'twitter', 'spotify', etc.
    url TEXT NOT NULL,
    PRIMARY KEY (user_id, platform)
);

-- ---------------------------------------------------------------------
-- 4. SOCIAL RELATIONS DB-SYNC BACKUP
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'requested', 'accepted', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_not_self_friend CHECK (user_id_1 <> user_id_2)
);

CREATE TABLE IF NOT EXISTS public.followers (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT chk_not_self_follow CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_post_id VARCHAR(255) NOT NULL, -- References original Firebase post content key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blocked_users (
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_not_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profile_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 5. SECURE SERVER-SIDE AI ACTIONS LOGGING
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_generated_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    original_prompt TEXT NOT NULL,
    generated_content TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'professional'::character varying,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recommended_type VARCHAR(100) NOT NULL, -- 'jobs', 'connections', 'beats', 'courses'
    target_id UUID NOT NULL, -- UUID in public schema table
    confidence_score NUMERIC(5,4) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    recommended_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_profile_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    suggested_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_not_self_suggest CHECK (user_id <> suggested_user_id)
);

-- ---------------------------------------------------------------------
-- 6. CREATOR ECONOMY
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creator_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio TEXT,
    tier VARCHAR(50) DEFAULT 'unverified'::character varying,
    payout_settings JSONB DEFAULT '{}'::jsonb,
    is_monetization_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
    plan_id VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'expired'
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'USD'::character varying,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.digital_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    price NUMERIC(10,2) DEFAULT 0.0 NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.digital_products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    status order_status_enum DEFAULT 'pending'::order_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 7. MUSIC PRODUCER SYSTEM
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.producer_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage_name VARCHAR(150) NOT NULL,
    bio TEXT,
    links JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.beats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL REFERENCES public.producer_profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    bpm INTEGER CHECK (bpm > 0),
    genre VARCHAR(100),
    musical_key VARCHAR(50),
    audio_url TEXT NOT NULL,
    preview_url TEXT,
    price NUMERIC(10,2) DEFAULT 0.0 CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.beat_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beat_id UUID REFERENCES public.beats(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_type license_type_enum DEFAULT 'basic_mp3'::license_type_enum NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    contract_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.beat_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.beat_licenses(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status order_status_enum DEFAULT 'pending'::order_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'beat', 'playlist', 'course'
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, target_type, target_id)
);

-- ---------------------------------------------------------------------
-- 8. LEARNING PLATFORM
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price NUMERIC(10,2) DEFAULT 0.0 CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    position INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    video_url TEXT,
    position INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    certificate_url TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- 9. CAREER HUB
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    website TEXT,
    headquarters VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    parsed_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.job_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poster_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    location VARCHAR(120),
    salary_range VARCHAR(100),
    job_type job_type_enum DEFAULT 'full_time'::job_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status application_status_enum DEFAULT 'applied'::application_status_enum NOT NULL,
    resume_url TEXT,
    cover_letter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_job_applicant UNIQUE (job_post_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS public.application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    status application_status_enum NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 10. COMMUNITY SYSTEM
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.community_members (
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role rls_role_enum DEFAULT 'member'::rls_role_enum NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    firebase_post_id VARCHAR(255) NOT NULL, -- Sync map identifier back to primary Firebase Database
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.community_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    rule_number INTEGER NOT NULL,
    rule_title VARCHAR(150) NOT NULL,
    rule_description TEXT,
    CONSTRAINT unique_community_rule_pos UNIQUE (community_id, rule_number)
);

-- ---------------------------------------------------------------------
-- 11. Q&A PLATFORM (REPUTATION ENGINE)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    upvotes_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT false,
    upvotes_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.question_votes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    vote_type vote_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.answer_votes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES public.answers(id) ON DELETE CASCADE,
    vote_type vote_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, answer_id)
);

CREATE TABLE IF NOT EXISTS public.user_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason_type VARCHAR(100) NOT NULL, -- 'accepted_answer', 'received_upvote'
    target_id UUID, -- References polymorphic items (question_id or answer_id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 12. EVENTS PLATFORM
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location_type event_location_enum DEFAULT 'online'::event_location_enum NOT NULL,
    location TEXT, -- Link if online, Address if in_person
    banner_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_event_times CHECK (start_time <= end_time)
);

CREATE TABLE IF NOT EXISTS public.event_attendees (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status rsvp_status_enum DEFAULT 'maybe'::rsvp_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.event_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 13. CLASSIFIED MARKETPLACE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.marketplace_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    condition VARCHAR(50), -- 'new', 'like_new', 'good', 'fair'
    location VARCHAR(150),
    is_sold BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    status order_status_enum DEFAULT 'pending'::order_status_enum NOT NULL,
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_intent_id VARCHAR(255) UNIQUE,
    payment_method VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_not_self_review CHECK (target_user_id <> reviewer_id)
);

-- ---------------------------------------------------------------------
-- 14. TEAM COLLABORATION
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'member'::character varying NOT NULL,
    formed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status task_status_enum DEFAULT 'todo'::task_status_enum NOT NULL,
    priority task_priority_enum DEFAULT 'medium'::task_priority_enum NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    size INTEGER CHECK (size >= 0),
    uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 15. PERFORMANCE ANALYTICS & BI DASHBOARD INGESTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_active_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_date DATE UNIQUE DEFAULT CURRENT_DATE NOT NULL,
    logged_users_count INTEGER DEFAULT 0 CHECK (logged_users_count >= 0),
    guest_sessions_count INTEGER DEFAULT 0 CHECK (guest_sessions_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.user_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_views INTEGER DEFAULT 0 CHECK (page_views >= 0),
    feature_interactions INTEGER DEFAULT 0 CHECK (feature_interactions >= 0),
    duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
    recorded_date DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR(255) NOT NULL, -- references external Firebase item key mapping
    category VARCHAR(100) NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    recorded_date DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.creator_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
    views_count INTEGER DEFAULT 0,
    audio_plays_count INTEGER DEFAULT 0,
    revenue_accumulated NUMERIC(15,2) DEFAULT 0.0,
    recorded_date DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(150) UNIQUE NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 16. SYSTEM BACKUPS & AUDITING
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(200) NOT NULL, -- 'login', 'unfriend', 'purchase', 'moderation_action'
    target_type VARCHAR(100),
    target_id UUID,
    previous_state JSONB DEFAULT '{}'::jsonb,
    new_state JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 17. SYSTEM ADMIN & CONTENT MODERATION SYSTEMS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_role system_admin_role_enum DEFAULT 'moderator'::system_admin_role_enum NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type VARCHAR(100) NOT NULL, -- 'user', 'beat', 'listing', 'comment'
    target_id UUID NOT NULL, -- UUID in public schema table
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending'::character varying NOT NULL, -- 'pending', 'resolved', 'dismissed'
    moderator_id UUID REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_taken moderation_action_enum DEFAULT 'none'::moderation_action_enum NOT NULL,
    duration_seconds INTEGER, -- For temporaries bans / shadowbans
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    identification_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending'::character varying NOT NULL, -- 'pending', 'approved', 'rejected'
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =====================================================================
-- 18. AUTOMATION FUNCTION TRIGGERS & TRIGGERS CONFIGURATION
-- =====================================================================

-- Auto update timestamps function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger configurations for CORE tables
CREATE TRIGGER on_user_updated
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_experience_updated
    BEFORE UPDATE ON public.work_experience
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_portfolio_updated
    BEFORE UPDATE ON public.portfolio_projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_beat_updated
    BEFORE UPDATE ON public.beats
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_marketplace_updated
    BEFORE UPDATE ON public.marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for auto populating profile and public.users on auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);

    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sphere User'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connect newly registered Auth users to SQL profiles layer immediately
CREATE OR REPLACE TRIGGER on_supabase_auth_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- =====================================================================
-- 19. ADVANCED PERFORMANCE INDEXES (FOR OUTSTANDING READ CAPACITY)
-- =====================================================================

-- GIN trigram indexes for high performance search of jobs, marketplace listings, and courses
CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_posts_search_trgm ON public.job_posts USING gin (title gin_trgm_ops, description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search_trgm ON public.marketplace_listings USING gin (title gin_trgm_ops, description gin_trgm_ops);

-- Performance Composite & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON public.user_skills (skill_id);
CREATE INDEX IF NOT EXISTS idx_friendships_active ON public.friendships (user_id_1, user_id_2) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_user_activity_search ON public.user_activity (user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_perf ON public.ai_recommendations (user_id, recommended_type, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_beats_bpm_genre ON public.beats (bpm, genre, price);
CREATE INDEX IF NOT EXISTS idx_course_lessons_pos ON public.lessons (module_id, position);
CREATE INDEX IF NOT EXISTS idx_marketplace_category_price ON public.marketplace_listings (category_id, price) WHERE is_sold = false;
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority ON public.tasks (project_id, status, priority, due_date);
CREATE INDEX IF NOT EXISTS idx_engagements_user_date ON public.user_engagement (user_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.audit_logs (target_type, target_id);


-- =====================================================================
-- 20. ROW LEVEL SECURITY (RLS) COMPLEX POLICIES (Supabase Compliance)
-- =====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone active can read, owners can write as authenticated
CREATE POLICY "Public profiles are readable by authenticated users"
    ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can edit their own personal profiles"
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Work Experience & Portfolio
CREATE POLICY "Experience readable by all logged users"
    ON public.work_experience FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can make changes to their work history"
    ON public.work_experience FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Job Hunt Board Board permissions
CREATE POLICY "Jobs can be browsed by developers"
    ON public.job_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Verified account owners can post jobs"
    ON public.job_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = poster_id);

CREATE POLICY "Job applications are readable by applicants and job authors"
    ON public.job_applications FOR SELECT TO authenticated USING (
        auth.uid() = applicant_id OR 
        EXISTS (SELECT 1 FROM public.job_posts WHERE id = job_post_id AND poster_id = auth.uid())
    );

CREATE POLICY "Applicants can send a fresh application"
    ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);

-- Creator monetization layers
CREATE POLICY "Beats audio catalog is readable"
    ON public.beats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Producers manage their own musical files"
    ON public.beats FOR ALL TO authenticated USING (auth.uid() = producer_id);

-- Marketplace system
CREATE POLICY "Listing browser query"
    ON public.marketplace_listings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Merchants manage their own product listings"
    ON public.marketplace_listings FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- Team details
CREATE POLICY "Team tasks are only readable by verified board members"
    ON public.tasks FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            JOIN public.team_members ON team_members.team_id = projects.team_id
            WHERE projects.id = project_id AND team_members.user_id = auth.uid()
        )
    );


-- =====================================================================
-- 21. EXAMPLE BUSINESS INTELLIGENCE (BI) ANALYTICAL QUERIES
-- =====================================================================

-- BI QUERY 1: Fetch Top 5 Most Engaging Creators ordered by cumulative views & subscription counts
-- SELECT 
--     p.full_name,
--     p.username,
--     ca.views_count,
--     ca.revenue_accumulated,
--     COUNT(s.id) AS active_subscribers_count
-- FROM public.creator_analytics ca
-- JOIN public.profiles p ON p.id = ca.creator_id
-- LEFT JOIN public.subscriptions s ON s.creator_id = ca.creator_id AND s.status = 'active'
-- WHERE ca.recorded_date >= (CURRENT_DATE - INTERVAL '30 days')
-- GROUP BY p.full_name, p.username, ca.views_count, ca.revenue_accumulated
-- ORDER BY ca.views_count DESC, active_subscribers_count DESC
-- LIMIT 5;

-- BI QUERY 2: Career Alignment Analyzer showing user skills matched to highly paid Job Listings titles
-- SELECT 
--     jp.title AS matching_job_title,
--     c.name AS hiring_company,
--     jp.salary_range,
--     COUNT(us.skill_id) AS matched_skills_count,
--     ARRAY_AGG(s.name) AS matched_skills_list
-- FROM public.job_posts jp
-- JOIN public.companies c ON c.id = jp.company_id
-- CROSS JOIN public.user_skills us
-- JOIN public.skills s ON s.id = us.skill_id
-- WHERE us.user_id = '00000000-0000-0000-0000-000000000000' -- Provide explicit active user UUID to check fit
--   AND (jp.description ILIKE '%' || s.name || '%' OR jp.requirements ILIKE '%' || s.name || '%')
-- GROUP BY jp.id, jp.title, c.name, jp.salary_range
-- ORDER BY matched_skills_count DESC
-- LIMIT 5;
