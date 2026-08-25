// Hand-authored from supabase/migrations/0001_init.sql.
// After linking a Supabase project, regenerate with:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RestaurantStatus = "draft" | "published" | "archived";
export type BookingMode = "instant" | "request" | "phone_only";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";
export type BookingSource = "web" | "dashboard" | "phone" | "walk_in";
export type MemberRole = "owner" | "manager" | "staff";

export type Database = {
  public: {
    Tables: {
      countries: {
        Row: {
          code: string;
          slug: string;
          name: Json;
          currency: string;
          timezone: string;
          phone_code: string;
          locales: string[];
          default_locale: string;
          bbox: Json | null;
          is_active: boolean;
        };
        Insert: {
          code: string;
          slug: string;
          name: Json;
          currency?: string;
          timezone: string;
          phone_code: string;
          locales?: string[];
          default_locale?: string;
          bbox?: Json | null;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          slug?: string;
          name?: Json;
          currency?: string;
          timezone?: string;
          phone_code?: string;
          locales?: string[];
          default_locale?: string;
          bbox?: Json | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      regions: {
        Row: {
          id: string;
          country_code: string;
          slug: string;
          name: Json;
          sort_order: number;
        };
        Insert: {
          id?: string;
          country_code: string;
          slug: string;
          name: Json;
          sort_order?: number;
        };
        Update: {
          id?: string;
          country_code?: string;
          slug?: string;
          name?: Json;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "regions_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["code"];
          },
        ];
      };
      areas: {
        Row: {
          id: string;
          region_id: string;
          slug: string;
          name: Json;
          lat: number | null;
          lng: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          region_id: string;
          slug: string;
          name: Json;
          lat?: number | null;
          lng?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          region_id?: string;
          slug?: string;
          name?: Json;
          lat?: number | null;
          lng?: number | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "areas_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      cuisines: {
        Row: { slug: string; name: Json; sort_order: number };
        Insert: { slug: string; name: Json; sort_order?: number };
        Update: { slug?: string; name?: Json; sort_order?: number };
        Relationships: [];
      };
      features: {
        Row: { slug: string; name: Json; icon: string | null };
        Insert: { slug: string; name: Json; icon?: string | null };
        Update: { slug?: string; name?: Json; icon?: string | null };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          slug: string;
          country_code: string;
          region_id: string;
          area_id: string | null;
          status: RestaurantStatus;
          booking_mode: BookingMode;
          price_band: number;
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
          website: string | null;
          instagram: string | null;
          menu_url: string | null;
          google_maps_url: string | null;
          address_line: string | null;
          postcode: string | null;
          lat: number;
          lng: number;
          timezone: string;
          min_party: number;
          max_party: number;
          lead_time_minutes: number;
          max_advance_days: number;
          turn_minutes: number;
          slot_interval_minutes: number;
          features: string[];
          is_featured: boolean;
          tables_are_placeholder: boolean;
          rating: number | null;
          review_count: number;
          owner_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          country_code: string;
          region_id: string;
          area_id?: string | null;
          status?: RestaurantStatus;
          booking_mode?: BookingMode;
          price_band: number;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          instagram?: string | null;
          menu_url?: string | null;
          google_maps_url?: string | null;
          address_line?: string | null;
          postcode?: string | null;
          lat: number;
          lng: number;
          timezone?: string;
          min_party?: number;
          max_party?: number;
          lead_time_minutes?: number;
          max_advance_days?: number;
          turn_minutes?: number;
          slot_interval_minutes?: number;
          features?: string[];
          is_featured?: boolean;
          tables_are_placeholder?: boolean;
          rating?: number | null;
          review_count?: number;
          owner_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          country_code?: string;
          region_id?: string;
          area_id?: string | null;
          status?: RestaurantStatus;
          booking_mode?: BookingMode;
          price_band?: number;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          instagram?: string | null;
          menu_url?: string | null;
          google_maps_url?: string | null;
          address_line?: string | null;
          postcode?: string | null;
          lat?: number;
          lng?: number;
          timezone?: string;
          min_party?: number;
          max_party?: number;
          lead_time_minutes?: number;
          max_advance_days?: number;
          turn_minutes?: number;
          slot_interval_minutes?: number;
          features?: string[];
          is_featured?: boolean;
          tables_are_placeholder?: boolean;
          rating?: number | null;
          review_count?: number;
          owner_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurants_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "restaurants_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurants_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_translations: {
        Row: {
          restaurant_id: string;
          locale: string;
          name: string;
          tagline: string | null;
          description: string | null;
          is_machine_translated: boolean;
        };
        Insert: {
          restaurant_id: string;
          locale: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          is_machine_translated?: boolean;
        };
        Update: {
          restaurant_id?: string;
          locale?: string;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          is_machine_translated?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_translations_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_cuisines: {
        Row: {
          restaurant_id: string;
          cuisine_slug: string;
          is_primary: boolean;
        };
        Insert: {
          restaurant_id: string;
          cuisine_slug: string;
          is_primary?: boolean;
        };
        Update: {
          restaurant_id?: string;
          cuisine_slug?: string;
          is_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_cuisines_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_cuisines_cuisine_slug_fkey";
            columns: ["cuisine_slug"];
            isOneToOne: false;
            referencedRelation: "cuisines";
            referencedColumns: ["slug"];
          },
        ];
      };
      photos: {
        Row: {
          id: string;
          restaurant_id: string;
          storage_path: string;
          width: number | null;
          height: number | null;
          blur_data_url: string | null;
          alt: Json | null;
          sort_order: number;
          is_cover: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          blur_data_url?: string | null;
          alt?: Json | null;
          sort_order?: number;
          is_cover?: boolean;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          storage_path?: string;
          width?: number | null;
          height?: number | null;
          blur_data_url?: string | null;
          alt?: Json | null;
          sort_order?: number;
          is_cover?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "photos_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      opening_hours: {
        Row: {
          id: string;
          restaurant_id: string;
          weekday: number;
          opens: string;
          closes: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          weekday: number;
          opens: string;
          closes: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          weekday?: number;
          opens?: string;
          closes?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opening_hours_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_periods: {
        Row: {
          id: string;
          restaurant_id: string;
          name: Json;
          weekdays: number[];
          first_seating: string;
          last_seating: string;
          slot_interval_minutes: number | null;
          turn_minutes: number | null;
          max_covers_per_slot: number | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: Json;
          weekdays: number[];
          first_seating: string;
          last_seating: string;
          slot_interval_minutes?: number | null;
          turn_minutes?: number | null;
          max_covers_per_slot?: number | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: Json;
          weekdays?: number[];
          first_seating?: string;
          last_seating?: string;
          slot_interval_minutes?: number | null;
          turn_minutes?: number | null;
          max_covers_per_slot?: number | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "service_periods_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      dining_tables: {
        Row: {
          id: string;
          restaurant_id: string;
          label: string;
          min_party: number;
          max_party: number;
          is_online_bookable: boolean;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          label: string;
          min_party?: number;
          max_party: number;
          is_online_bookable?: boolean;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          label?: string;
          min_party?: number;
          max_party?: number;
          is_online_bookable?: boolean;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dining_tables_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      closures: {
        Row: {
          id: string;
          restaurant_id: string;
          starts_at: string;
          ends_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          starts_at: string;
          ends_at: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          starts_at?: string;
          ends_at?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "closures_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string | null;
          starts_at: string;
          ends_at: string;
          party_size: number;
          status: BookingStatus;
          source: BookingSource;
          guest_name: string;
          guest_email: string | null;
          guest_phone: string | null;
          guest_locale: string;
          special_requests: string | null;
          confirmation_code: string;
          manage_token: string;
          confirmed_at: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          reminder_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // bookings are created only via the create_booking RPC
        Update: {
          status?: BookingStatus;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          reminder_sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_members: {
        Row: {
          user_id: string;
          restaurant_id: string;
          role: MemberRole;
        };
        Insert: {
          user_id: string;
          restaurant_id: string;
          role?: MemberRole;
        };
        Update: {
          user_id?: string;
          restaurant_id?: string;
          role?: MemberRole;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_availability: {
        Args: {
          p_restaurant_id: string;
          p_date: string;
          p_party_size: number;
        };
        Returns: {
          slot: string;
          slot_local: string;
          service_period_id: string;
          service_name: Json;
          available: boolean;
          reason: string | null;
        }[];
      };
      create_booking: {
        Args: {
          p_restaurant_id: string;
          p_starts_at: string;
          p_party_size: number;
          p_guest_name: string;
          p_guest_email?: string | null;
          p_guest_phone?: string | null;
          p_locale?: string;
          p_special_requests?: string | null;
          p_source?: BookingSource;
          p_bypass_rules?: boolean;
        };
        Returns: {
          id: string;
          confirmation_code: string;
          manage_token: string;
          starts_at: string;
          ends_at: string;
          party_size: number;
          status: BookingStatus;
          table_label: string;
        }[];
      };
      get_booking_by_token: {
        Args: { p_token: string };
        Returns: {
          id: string;
          confirmation_code: string;
          starts_at: string;
          ends_at: string;
          party_size: number;
          status: BookingStatus;
          guest_name: string;
          special_requests: string | null;
          restaurant_id: string;
          restaurant_slug: string;
          restaurant_timezone: string;
          restaurant_phone: string | null;
          restaurant_address: string | null;
          restaurant_lat: number;
          restaurant_lng: number;
        }[];
      };
      cancel_booking_by_token: {
        Args: { p_token: string };
        Returns: BookingStatus;
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_restaurant_member: {
        Args: { rid: string };
        Returns: boolean;
      };
    };
    Enums: {
      restaurant_status: RestaurantStatus;
      booking_mode: BookingMode;
      booking_status: BookingStatus;
      booking_source: BookingSource;
      member_role: MemberRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type AvailabilitySlot =
  Database["public"]["Functions"]["get_availability"]["Returns"][number];
export type BookingResult =
  Database["public"]["Functions"]["create_booking"]["Returns"][number];
export type BookingByToken =
  Database["public"]["Functions"]["get_booking_by_token"]["Returns"][number];
