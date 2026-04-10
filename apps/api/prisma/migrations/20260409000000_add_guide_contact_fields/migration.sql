-- Add contact fields for guide accounts to reach out about in-person expeditions
ALTER TABLE "user_profiles" ADD COLUMN "phone_number" VARCHAR(30);
ALTER TABLE "user_profiles" ADD COLUMN "preferred_contact_method" VARCHAR(20);
