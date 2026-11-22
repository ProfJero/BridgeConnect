export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      advertisements: {
        Row: {
          body: string | null;
          clicks: number;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          entity_id: string;
          id: string;
          image_path: string | null;
          impressions: number;
          link_path: string | null;
          placement: Database["public"]["Enums"]["ad_placement"];
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          starts_on: string;
          status: Database["public"]["Enums"]["ad_status"];
          target_community_id: string | null;
          target_district_id: string | null;
          target_region_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          clicks?: number;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          entity_id: string;
          id?: string;
          image_path?: string | null;
          impressions?: number;
          link_path?: string | null;
          placement: Database["public"]["Enums"]["ad_placement"];
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          starts_on: string;
          status?: Database["public"]["Enums"]["ad_status"];
          target_community_id?: string | null;
          target_district_id?: string | null;
          target_region_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          clicks?: number;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          entity_id?: string;
          id?: string;
          image_path?: string | null;
          impressions?: number;
          link_path?: string | null;
          placement?: Database["public"]["Enums"]["ad_placement"];
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          starts_on?: string;
          status?: Database["public"]["Enums"]["ad_status"];
          target_community_id?: string | null;
          target_district_id?: string | null;
          target_region_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "advertisements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advertisements_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advertisements_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advertisements_target_community_id_fkey";
            columns: ["target_community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advertisements_target_community_id_fkey";
            columns: ["target_community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "advertisements_target_district_id_fkey";
            columns: ["target_district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advertisements_target_district_id_fkey";
            columns: ["target_district_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["district_id"];
          },
          {
            foreignKeyName: "advertisements_target_region_id_fkey";
            columns: ["target_region_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["region_id"];
          },
          {
            foreignKeyName: "advertisements_target_region_id_fkey";
            columns: ["target_region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      application_documents: {
        Row: {
          application_id: string;
          created_at: string;
          document_type: Database["public"]["Enums"]["verification_document_type"];
          file_name: string;
          id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          application_id: string;
          created_at?: string;
          document_type: Database["public"]["Enums"]["verification_document_type"];
          file_name: string;
          id?: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          document_type?: Database["public"]["Enums"]["verification_document_type"];
          file_name?: string;
          id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "entity_applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      application_events: {
        Row: {
          actor_id: string | null;
          application_id: string;
          created_at: string;
          event: Database["public"]["Enums"]["application_event_type"];
          id: string;
          is_internal: boolean;
          note: string | null;
        };
        Insert: {
          actor_id?: string | null;
          application_id: string;
          created_at?: string;
          event: Database["public"]["Enums"]["application_event_type"];
          id?: string;
          is_internal?: boolean;
          note?: string | null;
        };
        Update: {
          actor_id?: string | null;
          application_id?: string;
          created_at?: string;
          event?: Database["public"]["Enums"]["application_event_type"];
          id?: string;
          is_internal?: boolean;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "application_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_events_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "entity_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          community_id: string | null;
          created_at: string;
          district_id: string | null;
          id: number;
          metadata: NonNullable<Json>;
          region_id: string | null;
          target_id: string | null;
          target_table: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: never;
          metadata?: NonNullable<Json>;
          region_id?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: never;
          metadata?: NonNullable<Json>;
          region_id?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "audit_logs_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["district_id"];
          },
          {
            foreignKeyName: "audit_logs_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["region_id"];
          },
          {
            foreignKeyName: "audit_logs_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      business_profiles: {
        Row: {
          accepts_mobile_money: boolean;
          delivery_available: boolean;
          entity_id: string;
          updated_at: string;
          year_established: number | null;
        };
        Insert: {
          accepts_mobile_money?: boolean;
          delivery_available?: boolean;
          entity_id: string;
          updated_at?: string;
          year_established?: number | null;
        };
        Update: {
          accepts_mobile_money?: boolean;
          delivery_available?: boolean;
          entity_id?: string;
          updated_at?: string;
          year_established?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_profiles_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: true;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      communities: {
        Row: {
          created_at: string;
          description: string | null;
          district_id: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          district_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          district_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communities_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communities_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["district_id"];
          },
        ];
      };
      conversation_messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string | null;
          sender_side: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          sender_side: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          sender_side?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_last_read_at: string | null;
          id: string;
          last_message_at: string;
          last_message_preview: string | null;
          last_sender_side: string | null;
          status: Database["public"]["Enums"]["conversation_status"];
          subject: string | null;
          updated_at: string;
          user_id: string;
          user_last_read_at: string | null;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_last_read_at?: string | null;
          id?: string;
          last_message_at?: string;
          last_message_preview?: string | null;
          last_sender_side?: string | null;
          status?: Database["public"]["Enums"]["conversation_status"];
          subject?: string | null;
          updated_at?: string;
          user_id: string;
          user_last_read_at?: string | null;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_last_read_at?: string | null;
          id?: string;
          last_message_at?: string;
          last_message_preview?: string | null;
          last_sender_side?: string | null;
          status?: Database["public"]["Enums"]["conversation_status"];
          subject?: string | null;
          updated_at?: string;
          user_id?: string;
          user_last_read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      districts: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          region_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          region_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          region_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "districts_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["region_id"];
          },
          {
            foreignKeyName: "districts_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      emergency_alerts: {
        Row: {
          body: string;
          category: Database["public"]["Enums"]["alert_category"];
          community_id: string | null;
          created_at: string;
          district_id: string | null;
          expires_at: string | null;
          id: string;
          instructions: string | null;
          issued_by: string | null;
          issuing_entity_id: string | null;
          region_id: string | null;
          resolved_at: string | null;
          severity: Database["public"]["Enums"]["alert_severity"];
          starts_at: string;
          status: Database["public"]["Enums"]["alert_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          category: Database["public"]["Enums"]["alert_category"];
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          expires_at?: string | null;
          id?: string;
          instructions?: string | null;
          issued_by?: string | null;
          issuing_entity_id?: string | null;
          region_id?: string | null;
          resolved_at?: string | null;
          severity: Database["public"]["Enums"]["alert_severity"];
          starts_at?: string;
          status?: Database["public"]["Enums"]["alert_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          category?: Database["public"]["Enums"]["alert_category"];
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          expires_at?: string | null;
          id?: string;
          instructions?: string | null;
          issued_by?: string | null;
          issuing_entity_id?: string | null;
          region_id?: string | null;
          resolved_at?: string | null;
          severity?: Database["public"]["Enums"]["alert_severity"];
          starts_at?: string;
          status?: Database["public"]["Enums"]["alert_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emergency_alerts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_alerts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "emergency_alerts_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_alerts_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["district_id"];
          },
          {
            foreignKeyName: "emergency_alerts_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_alerts_issuing_entity_id_fkey";
            columns: ["issuing_entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_alerts_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["region_id"];
          },
          {
            foreignKeyName: "emergency_alerts_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      emergency_contacts: {
        Row: {
          alt_phone: string | null;
          community_id: string | null;
          created_at: string;
          district_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          phone: string;
          region_id: string | null;
          service: Database["public"]["Enums"]["emergency_service"];
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          alt_phone?: string | null;
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          phone: string;
          region_id?: string | null;
          service: Database["public"]["Enums"]["emergency_service"];
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          alt_phone?: string | null;
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string;
          region_id?: string | null;
          service?: Database["public"]["Enums"]["emergency_service"];
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_contacts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "emergency_contacts_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_contacts_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["district_id"];
          },
          {
            foreignKeyName: "emergency_contacts_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["region_id"];
          },
          {
            foreignKeyName: "emergency_contacts_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      entities: {
        Row: {
          address: string | null;
          community_id: string;
          cover_path: string | null;
          created_at: string;
          description: string | null;
          email: string | null;
          entity_type: Database["public"]["Enums"]["entity_type"];
          follower_count: number;
          id: string;
          logo_path: string | null;
          name: string;
          opening_hours: Json | null;
          phone: string | null;
          rating_avg: number | null;
          rating_count: number;
          search: unknown;
          sector: Database["public"]["Enums"]["sector"];
          slug: string;
          status: Database["public"]["Enums"]["entity_status"];
          status_reason: string | null;
          tagline: string | null;
          updated_at: string;
          verified_at: string;
          verified_by: string | null;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          community_id: string;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          entity_type: Database["public"]["Enums"]["entity_type"];
          follower_count?: number;
          id?: string;
          logo_path?: string | null;
          name: string;
          opening_hours?: Json | null;
          phone?: string | null;
          rating_avg?: number | null;
          rating_count?: number;
          search?: never;
          sector: Database["public"]["Enums"]["sector"];
          slug: string;
          status?: Database["public"]["Enums"]["entity_status"];
          status_reason?: string | null;
          tagline?: string | null;
          updated_at?: string;
          verified_at?: string;
          verified_by?: string | null;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          community_id?: string;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          entity_type?: Database["public"]["Enums"]["entity_type"];
          follower_count?: number;
          id?: string;
          logo_path?: string | null;
          name?: string;
          opening_hours?: Json | null;
          phone?: string | null;
          rating_avg?: number | null;
          rating_count?: number;
          search?: never;
          sector?: Database["public"]["Enums"]["sector"];
          slug?: string;
          status?: Database["public"]["Enums"]["entity_status"];
          status_reason?: string | null;
          tagline?: string | null;
          updated_at?: string;
          verified_at?: string;
          verified_by?: string | null;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entities_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entities_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "entities_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_applications: {
        Row: {
          address: string | null;
          applicant_id: string;
          applicant_position: string | null;
          community_id: string;
          contact_email: string | null;
          contact_phone: string;
          created_at: string;
          decided_at: string | null;
          decision_reason: string | null;
          description: string;
          entity_id: string | null;
          entity_type: Database["public"]["Enums"]["entity_type"];
          id: string;
          proposed_name: string;
          registration_number: string | null;
          reviewer_id: string | null;
          sector: Database["public"]["Enums"]["sector"];
          status: Database["public"]["Enums"]["application_status"];
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          applicant_id?: string;
          applicant_position?: string | null;
          community_id: string;
          contact_email?: string | null;
          contact_phone: string;
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          description: string;
          entity_id?: string | null;
          entity_type: Database["public"]["Enums"]["entity_type"];
          id?: string;
          proposed_name: string;
          registration_number?: string | null;
          reviewer_id?: string | null;
          sector: Database["public"]["Enums"]["sector"];
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          applicant_id?: string;
          applicant_position?: string | null;
          community_id?: string;
          contact_email?: string | null;
          contact_phone?: string;
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          description?: string;
          entity_id?: string | null;
          entity_type?: Database["public"]["Enums"]["entity_type"];
          id?: string;
          proposed_name?: string;
          registration_number?: string | null;
          reviewer_id?: string | null;
          sector?: Database["public"]["Enums"]["sector"];
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_applications_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_applications_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "entity_applications_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_applications_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_capability_overrides: {
        Row: {
          capability: Database["public"]["Enums"]["entity_capability"];
          created_at: string;
          enabled: boolean;
          entity_id: string;
          set_by: string | null;
        };
        Insert: {
          capability: Database["public"]["Enums"]["entity_capability"];
          created_at?: string;
          enabled: boolean;
          entity_id: string;
          set_by?: string | null;
        };
        Update: {
          capability?: Database["public"]["Enums"]["entity_capability"];
          created_at?: string;
          enabled?: boolean;
          entity_id?: string;
          set_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entity_capability_overrides_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_capability_overrides_set_by_fkey";
            columns: ["set_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_follows: {
        Row: {
          created_at: string;
          entity_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_follows_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_follows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_memberships: {
        Row: {
          created_at: string;
          entity_id: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["membership_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          id?: string;
          invited_by?: string | null;
          role: Database["public"]["Enums"]["membership_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["membership_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_memberships_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_memberships_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_reviews: {
        Row: {
          author_id: string;
          body: string | null;
          created_at: string;
          edited_at: string | null;
          entity_id: string;
          id: string;
          moderation_reason: string | null;
          rating: number;
          responded_at: string | null;
          responded_by: string | null;
          response: string | null;
          status: Database["public"]["Enums"]["content_status"];
          title: string | null;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          body?: string | null;
          created_at?: string;
          edited_at?: string | null;
          entity_id: string;
          id?: string;
          moderation_reason?: string | null;
          rating: number;
          responded_at?: string | null;
          responded_by?: string | null;
          response?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string | null;
          created_at?: string;
          edited_at?: string | null;
          entity_id?: string;
          id?: string;
          moderation_reason?: string | null;
          rating?: number;
          responded_at?: string | null;
          responded_by?: string | null;
          response?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_reviews_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_reviews_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_reviews_responded_by_fkey";
            columns: ["responded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_type_capabilities: {
        Row: {
          capability: Database["public"]["Enums"]["entity_capability"];
          entity_type: Database["public"]["Enums"]["entity_type"];
        };
        Insert: {
          capability: Database["public"]["Enums"]["entity_capability"];
          entity_type: Database["public"]["Enums"]["entity_type"];
        };
        Update: {
          capability?: Database["public"]["Enums"]["entity_capability"];
          entity_type?: Database["public"]["Enums"]["entity_type"];
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          status: Database["public"]["Enums"]["rsvp_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          status: Database["public"]["Enums"]["rsvp_status"];
          user_id?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          status?: Database["public"]["Enums"]["rsvp_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          category_id: string | null;
          community_id: string;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          ends_at: string | null;
          entity_id: string;
          going_count: number;
          id: string;
          is_online: boolean;
          moderation_reason: string | null;
          online_url: string | null;
          search: unknown;
          slug: string;
          starts_at: string;
          status: Database["public"]["Enums"]["event_status"];
          title: string;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          capacity?: number | null;
          category_id?: string | null;
          community_id: string;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          ends_at?: string | null;
          entity_id: string;
          going_count?: number;
          id?: string;
          is_online?: boolean;
          moderation_reason?: string | null;
          online_url?: string | null;
          search?: never;
          slug?: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["event_status"];
          title: string;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          capacity?: number | null;
          category_id?: string | null;
          community_id?: string;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          ends_at?: string | null;
          entity_id?: string;
          going_count?: number;
          id?: string;
          is_online?: boolean;
          moderation_reason?: string | null;
          online_url?: string | null;
          search?: never;
          slug?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["event_status"];
          title?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "listing_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      favourites: {
        Row: {
          created_at: string;
          entity_id: string | null;
          event_id: string | null;
          id: string;
          job_id: string | null;
          product_id: string | null;
          service_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          event_id?: string | null;
          id?: string;
          job_id?: string | null;
          product_id?: string | null;
          service_id?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          event_id?: string | null;
          id?: string;
          job_id?: string | null;
          product_id?: string | null;
          service_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favourites_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_applications: {
        Row: {
          applicant_id: string;
          contact_phone: string;
          cover_letter: string;
          created_at: string;
          cv_path: string | null;
          employer_note: string | null;
          id: string;
          job_id: string;
          status: Database["public"]["Enums"]["job_application_status"];
          updated_at: string;
        };
        Insert: {
          applicant_id?: string;
          contact_phone: string;
          cover_letter: string;
          created_at?: string;
          cv_path?: string | null;
          employer_note?: string | null;
          id?: string;
          job_id: string;
          status?: Database["public"]["Enums"]["job_application_status"];
          updated_at?: string;
        };
        Update: {
          applicant_id?: string;
          contact_phone?: string;
          cover_letter?: string;
          created_at?: string;
          cv_path?: string | null;
          employer_note?: string | null;
          id?: string;
          job_id?: string;
          status?: Database["public"]["Enums"]["job_application_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          application_deadline: string | null;
          category_id: string | null;
          community_id: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string;
          employment_type: Database["public"]["Enums"]["employment_type"];
          entity_id: string;
          id: string;
          location_note: string | null;
          moderation_reason: string | null;
          published_at: string | null;
          requirements: string | null;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: Database["public"]["Enums"]["pay_period"] | null;
          search: unknown;
          slug: string;
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          application_deadline?: string | null;
          category_id?: string | null;
          community_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description: string;
          employment_type: Database["public"]["Enums"]["employment_type"];
          entity_id: string;
          id?: string;
          location_note?: string | null;
          moderation_reason?: string | null;
          published_at?: string | null;
          requirements?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: Database["public"]["Enums"]["pay_period"] | null;
          search?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          application_deadline?: string | null;
          category_id?: string | null;
          community_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          entity_id?: string;
          id?: string;
          location_note?: string | null;
          moderation_reason?: string | null;
          published_at?: string | null;
          requirements?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: Database["public"]["Enums"]["pay_period"] | null;
          search?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "listing_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "jobs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_categories: {
        Row: {
          domain: Database["public"]["Enums"]["listing_domain"];
          id: string;
          is_active: boolean;
          name: string;
          sector: Database["public"]["Enums"]["sector"] | null;
          slug: string;
          sort_order: number;
        };
        Insert: {
          domain: Database["public"]["Enums"]["listing_domain"];
          id?: string;
          is_active?: boolean;
          name: string;
          sector?: Database["public"]["Enums"]["sector"] | null;
          slug: string;
          sort_order?: number;
        };
        Update: {
          domain?: Database["public"]["Enums"]["listing_domain"];
          id?: string;
          is_active?: boolean;
          name?: string;
          sector?: Database["public"]["Enums"]["sector"] | null;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          alt_text: string | null;
          created_at: string;
          entity_id: string | null;
          height: number | null;
          id: string;
          mime_type: string;
          owner_id: string;
          size_bytes: number;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          entity_id?: string | null;
          height?: number | null;
          id?: string;
          mime_type: string;
          owner_id?: string;
          size_bytes: number;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          entity_id?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string;
          owner_id?: string;
          size_bytes?: number;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action_type"];
          community_id: string | null;
          created_at: string;
          id: string;
          moderator_id: string | null;
          reason: string;
          report_id: string | null;
          target_id: string | null;
          target_type: Database["public"]["Enums"]["moderation_target"] | null;
        };
        Insert: {
          action: Database["public"]["Enums"]["moderation_action_type"];
          community_id?: string | null;
          created_at?: string;
          id?: string;
          moderator_id?: string | null;
          reason: string;
          report_id?: string | null;
          target_id?: string | null;
          target_type?: Database["public"]["Enums"]["moderation_target"] | null;
        };
        Update: {
          action?: Database["public"]["Enums"]["moderation_action_type"];
          community_id?: string | null;
          created_at?: string;
          id?: string;
          moderator_id?: string | null;
          reason?: string;
          report_id?: string | null;
          target_id?: string | null;
          target_type?: Database["public"]["Enums"]["moderation_target"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_actions_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey";
            columns: ["moderator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          link: string | null;
          read_at: string | null;
          recipient_id: string;
          title: string;
          type: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          recipient_id: string;
          title: string;
          type: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          line_total: number | null;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          line_total?: never;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          id?: string;
          line_total?: never;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: number;
          note: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          note?: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          note?: string | null;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          buyer_id: string;
          buyer_note: string | null;
          contact_phone: string;
          created_at: string;
          currency: string;
          delivery_address: string | null;
          entity_id: string;
          fulfilment: Database["public"]["Enums"]["fulfilment_method"];
          id: string;
          order_number: string;
          status: Database["public"]["Enums"]["order_status"];
          status_reason: string | null;
          subtotal: number;
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          buyer_note?: string | null;
          contact_phone: string;
          created_at?: string;
          currency: string;
          delivery_address?: string | null;
          entity_id: string;
          fulfilment: Database["public"]["Enums"]["fulfilment_method"];
          id?: string;
          order_number?: string;
          status?: Database["public"]["Enums"]["order_status"];
          status_reason?: string | null;
          subtotal: number;
          updated_at?: string;
        };
        Update: {
          buyer_id?: string;
          buyer_note?: string | null;
          contact_phone?: string;
          created_at?: string;
          currency?: string;
          delivery_address?: string | null;
          entity_id?: string;
          fulfilment?: Database["public"]["Enums"]["fulfilment_method"];
          id?: string;
          order_number?: string;
          status?: Database["public"]["Enums"]["order_status"];
          status_reason?: string | null;
          subtotal?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      organisation_profiles: {
        Row: {
          beneficiaries: string | null;
          entity_id: string;
          mission: string | null;
          updated_at: string;
          year_established: number | null;
        };
        Insert: {
          beneficiaries?: string | null;
          entity_id: string;
          mission?: string | null;
          updated_at?: string;
          year_established?: number | null;
        };
        Update: {
          beneficiaries?: string | null;
          entity_id?: string;
          mission?: string | null;
          updated_at?: string;
          year_established?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_profiles_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: true;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          category: string;
          description: string;
          key: string;
        };
        Insert: {
          category: string;
          description: string;
          key: string;
        };
        Update: {
          category?: string;
          description?: string;
          key?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          description: string;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          description: string;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_options: {
        Row: {
          id: string;
          label: string;
          position: number;
          post_id: string;
          vote_count: number;
        };
        Insert: {
          id?: string;
          label: string;
          position: number;
          post_id: string;
          vote_count?: number;
        };
        Update: {
          id?: string;
          label?: string;
          position?: number;
          post_id?: string;
          vote_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_votes: {
        Row: {
          created_at: string;
          option_id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          option_id: string;
          post_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          option_id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "poll_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          moderation_reason: string | null;
          post_id: string;
          status: Database["public"]["Enums"]["content_status"];
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          id?: string;
          moderation_reason?: string | null;
          post_id: string;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          moderation_reason?: string | null;
          post_id?: string;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_media: {
        Row: {
          media_id: string;
          position: number;
          post_id: string;
        };
        Insert: {
          media_id: string;
          position?: number;
          post_id: string;
        };
        Update: {
          media_id?: string;
          position?: number;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_media_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_reactions: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          body: string;
          comment_count: number;
          community_id: string;
          created_at: string;
          edited_at: string | null;
          entity_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["post_kind"];
          moderation_reason: string | null;
          poll_closes_at: string | null;
          reaction_count: number;
          resolved_at: string | null;
          search: unknown;
          status: Database["public"]["Enums"]["content_status"];
          title: string | null;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          body: string;
          comment_count?: number;
          community_id: string;
          created_at?: string;
          edited_at?: string | null;
          entity_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["post_kind"];
          moderation_reason?: string | null;
          poll_closes_at?: string | null;
          reaction_count?: number;
          resolved_at?: string | null;
          search?: never;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          comment_count?: number;
          community_id?: string;
          created_at?: string;
          edited_at?: string | null;
          entity_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["post_kind"];
          moderation_reason?: string | null;
          poll_closes_at?: string | null;
          reaction_count?: number;
          resolved_at?: string | null;
          search?: never;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "posts_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      product_media: {
        Row: {
          media_id: string;
          position: number;
          product_id: string;
        };
        Insert: {
          media_id: string;
          position?: number;
          product_id: string;
        };
        Update: {
          media_id?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          entity_id: string;
          id: string;
          moderation_reason: string | null;
          name: string;
          price: number;
          search: unknown;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock_quantity: number | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          entity_id: string;
          id?: string;
          moderation_reason?: string | null;
          name: string;
          price: number;
          search?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_quantity?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          entity_id?: string;
          id?: string;
          moderation_reason?: string | null;
          name?: string;
          price?: number;
          search?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_quantity?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "listing_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"];
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          home_community_id: string | null;
          id: string;
          is_demo: boolean;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"];
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          home_community_id?: string | null;
          id: string;
          is_demo?: boolean;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"];
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          home_community_id?: string | null;
          id?: string;
          is_demo?: boolean;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_home_community_id_fkey";
            columns: ["home_community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_home_community_id_fkey";
            columns: ["home_community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
        ];
      };
      regions: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rental_inquiries: {
        Row: {
          contact_phone: string;
          created_at: string;
          id: string;
          message: string;
          preferred_date: string | null;
          rental_id: string;
          sender_id: string;
          status: Database["public"]["Enums"]["inquiry_status"];
          updated_at: string;
        };
        Insert: {
          contact_phone: string;
          created_at?: string;
          id?: string;
          message: string;
          preferred_date?: string | null;
          rental_id: string;
          sender_id?: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Update: {
          contact_phone?: string;
          created_at?: string;
          id?: string;
          message?: string;
          preferred_date?: string | null;
          rental_id?: string;
          sender_id?: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rental_inquiries_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rental_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rental_inquiries_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rental_listings: {
        Row: {
          advance_months: number | null;
          amenities: string[];
          available_from: string | null;
          bathrooms: number | null;
          bedrooms: number | null;
          community_id: string;
          contact_phone: string;
          created_at: string;
          currency: string;
          description: string;
          furnished: boolean;
          id: string;
          location_note: string | null;
          moderation_reason: string | null;
          owner_id: string;
          period: Database["public"]["Enums"]["rental_period"];
          price: number;
          rental_type: Database["public"]["Enums"]["rental_type"];
          search: unknown;
          slug: string;
          status: Database["public"]["Enums"]["rental_status"];
          title: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          advance_months?: number | null;
          amenities?: string[];
          available_from?: string | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          community_id: string;
          contact_phone: string;
          created_at?: string;
          currency?: string;
          description: string;
          furnished?: boolean;
          id?: string;
          location_note?: string | null;
          moderation_reason?: string | null;
          owner_id?: string;
          period?: Database["public"]["Enums"]["rental_period"];
          price: number;
          rental_type: Database["public"]["Enums"]["rental_type"];
          search?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["rental_status"];
          title: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          advance_months?: number | null;
          amenities?: string[];
          available_from?: string | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          community_id?: string;
          contact_phone?: string;
          created_at?: string;
          currency?: string;
          description?: string;
          furnished?: boolean;
          id?: string;
          location_note?: string | null;
          moderation_reason?: string | null;
          owner_id?: string;
          period?: Database["public"]["Enums"]["rental_period"];
          price?: number;
          rental_type?: Database["public"]["Enums"]["rental_type"];
          search?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["rental_status"];
          title?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rental_listings_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rental_listings_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "rental_listings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rental_media: {
        Row: {
          media_id: string;
          position: number;
          rental_id: string;
        };
        Insert: {
          media_id: string;
          position?: number;
          rental_id: string;
        };
        Update: {
          media_id?: string;
          position?: number;
          rental_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rental_media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rental_media_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rental_listings";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          comment_id: string | null;
          community_id: string | null;
          created_at: string;
          details: string | null;
          entity_id: string | null;
          event_id: string | null;
          handled_by: string | null;
          id: string;
          job_id: string | null;
          post_id: string | null;
          product_id: string | null;
          profile_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          rental_id: string | null;
          reporter_id: string;
          resolution_note: string | null;
          resolved_at: string | null;
          review_id: string | null;
          service_id: string | null;
          status: Database["public"]["Enums"]["report_status"];
          updated_at: string;
        };
        Insert: {
          comment_id?: string | null;
          community_id?: string | null;
          created_at?: string;
          details?: string | null;
          entity_id?: string | null;
          event_id?: string | null;
          handled_by?: string | null;
          id?: string;
          job_id?: string | null;
          post_id?: string | null;
          product_id?: string | null;
          profile_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          rental_id?: string | null;
          reporter_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          review_id?: string | null;
          service_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
        };
        Update: {
          comment_id?: string | null;
          community_id?: string | null;
          created_at?: string;
          details?: string | null;
          entity_id?: string | null;
          event_id?: string | null;
          handled_by?: string | null;
          id?: string;
          job_id?: string | null;
          post_id?: string | null;
          product_id?: string | null;
          profile_id?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          rental_id?: string | null;
          reporter_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          review_id?: string | null;
          service_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "post_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "reports_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rental_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "entity_reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      rider_profiles: {
        Row: {
          bio: string | null;
          community_id: string;
          completed_trips: number;
          created_at: string;
          is_online: boolean;
          last_lat: number | null;
          last_lng: number | null;
          last_online_at: string | null;
          offers_delivery: boolean;
          offers_rides: boolean;
          phone: string;
          plate_number: string | null;
          rating_avg: number | null;
          rating_count: number;
          reviewed_by: string | null;
          service_area: string | null;
          status: Database["public"]["Enums"]["rider_status"];
          status_reason: string | null;
          updated_at: string;
          user_id: string;
          vehicle_description: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
          whatsapp: string | null;
        };
        Insert: {
          bio?: string | null;
          community_id: string;
          completed_trips?: number;
          created_at?: string;
          is_online?: boolean;
          last_lat?: number | null;
          last_lng?: number | null;
          last_online_at?: string | null;
          offers_delivery?: boolean;
          offers_rides?: boolean;
          phone: string;
          plate_number?: string | null;
          rating_avg?: number | null;
          rating_count?: number;
          reviewed_by?: string | null;
          service_area?: string | null;
          status?: Database["public"]["Enums"]["rider_status"];
          status_reason?: string | null;
          updated_at?: string;
          user_id: string;
          vehicle_description: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
          whatsapp?: string | null;
        };
        Update: {
          bio?: string | null;
          community_id?: string;
          completed_trips?: number;
          created_at?: string;
          is_online?: boolean;
          last_lat?: number | null;
          last_lng?: number | null;
          last_online_at?: string | null;
          offers_delivery?: boolean;
          offers_rides?: boolean;
          phone?: string;
          plate_number?: string | null;
          rating_avg?: number | null;
          rating_count?: number;
          reviewed_by?: string | null;
          service_area?: string | null;
          status?: Database["public"]["Enums"]["rider_status"];
          status_reason?: string | null;
          updated_at?: string;
          user_id?: string;
          vehicle_description?: string;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"];
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rider_profiles_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rider_profiles_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "rider_profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rider_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission_key: string;
          role_id: string;
        };
        Insert: {
          permission_key: string;
          role_id: string;
        };
        Update: {
          permission_key?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_system: boolean;
          key: string;
          name: string;
          scope_level: Database["public"]["Enums"]["scope_level"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          key: string;
          name: string;
          scope_level: Database["public"]["Enums"]["scope_level"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          key?: string;
          name?: string;
          scope_level?: Database["public"]["Enums"]["scope_level"];
          updated_at?: string;
        };
        Relationships: [];
      };
      service_bookings: {
        Row: {
          booking_number: number;
          contact_phone: string | null;
          created_at: string;
          customer_id: string;
          customer_note: string | null;
          entity_id: string;
          entity_note: string | null;
          id: string;
          requested_date: string;
          requested_time: string | null;
          service_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        Insert: {
          booking_number?: never;
          contact_phone?: string | null;
          created_at?: string;
          customer_id: string;
          customer_note?: string | null;
          entity_id: string;
          entity_note?: string | null;
          id?: string;
          requested_date: string;
          requested_time?: string | null;
          service_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Update: {
          booking_number?: never;
          contact_phone?: string | null;
          created_at?: string;
          customer_id?: string;
          customer_note?: string | null;
          entity_id?: string;
          entity_note?: string | null;
          id?: string;
          requested_date?: string;
          requested_time?: string | null;
          service_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_bookings_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          accepts_bookings: boolean;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          entity_id: string;
          id: string;
          moderation_reason: string | null;
          name: string;
          price_from: number | null;
          price_note: string | null;
          search: unknown;
          service_area: string | null;
          slug: string;
          status: Database["public"]["Enums"]["service_status"];
          updated_at: string;
        };
        Insert: {
          accepts_bookings?: boolean;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          entity_id: string;
          id?: string;
          moderation_reason?: string | null;
          name: string;
          price_from?: number | null;
          price_note?: string | null;
          search?: never;
          service_area?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["service_status"];
          updated_at?: string;
        };
        Update: {
          accepts_bookings?: boolean;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          entity_id?: string;
          id?: string;
          moderation_reason?: string | null;
          name?: string;
          price_from?: number | null;
          price_note?: string | null;
          search?: never;
          service_area?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["service_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "listing_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
        ];
      };
      support_ticket_messages: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          is_staff: boolean;
          ticket_id: string;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          ticket_id: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_to: string | null;
          category: Database["public"]["Enums"]["ticket_category"];
          created_at: string;
          entity_id: string | null;
          id: string;
          last_activity_at: string;
          priority: string;
          requester_id: string;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          ticket_number: number;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          category: Database["public"]["Enums"]["ticket_category"];
          created_at?: string;
          entity_id?: string | null;
          id?: string;
          last_activity_at?: string;
          priority?: string;
          requester_id: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          ticket_number?: never;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          category?: Database["public"]["Enums"]["ticket_category"];
          created_at?: string;
          entity_id?: string | null;
          id?: string;
          last_activity_at?: string;
          priority?: string;
          requester_id?: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          ticket_number?: never;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          accepted_at: string | null;
          arrived_at: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          community_id: string;
          completed_at: string | null;
          created_at: string;
          currency: string;
          customer_comment: string | null;
          customer_id: string;
          customer_phone: string;
          customer_rating: number | null;
          distance_km: number | null;
          dropoff_address: string;
          dropoff_lat: number | null;
          dropoff_lng: number | null;
          final_fare: number | null;
          id: string;
          kind: Database["public"]["Enums"]["trip_kind"];
          note: string | null;
          offered_fare: number;
          order_id: string | null;
          package_description: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          pickup_address: string;
          pickup_lat: number | null;
          pickup_lng: number | null;
          preferred_rider_id: string | null;
          rated_at: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          rider_id: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["trip_status"];
          trip_number: number;
          updated_at: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null;
        };
        Insert: {
          accepted_at?: string | null;
          arrived_at?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          community_id: string;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_comment?: string | null;
          customer_id: string;
          customer_phone: string;
          customer_rating?: number | null;
          distance_km?: number | null;
          dropoff_address: string;
          dropoff_lat?: number | null;
          dropoff_lng?: number | null;
          final_fare?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["trip_kind"];
          note?: string | null;
          offered_fare: number;
          order_id?: string | null;
          package_description?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          pickup_address: string;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          preferred_rider_id?: string | null;
          rated_at?: string | null;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          rider_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["trip_status"];
          trip_number?: never;
          updated_at?: string;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null;
        };
        Update: {
          accepted_at?: string | null;
          arrived_at?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          community_id?: string;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_comment?: string | null;
          customer_id?: string;
          customer_phone?: string;
          customer_rating?: number | null;
          distance_km?: number | null;
          dropoff_address?: string;
          dropoff_lat?: number | null;
          dropoff_lng?: number | null;
          final_fare?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["trip_kind"];
          note?: string | null;
          offered_fare?: number;
          order_id?: string | null;
          package_description?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          pickup_address?: string;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          preferred_rider_id?: string | null;
          rated_at?: string | null;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          rider_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["trip_status"];
          trip_number?: never;
          updated_at?: string;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "trips_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "trips_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_preferred_rider_id_fkey";
            columns: ["preferred_rider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_rider_id_fkey";
            columns: ["rider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_role_assignments: {
        Row: {
          community_id: string | null;
          created_at: string;
          district_id: string | null;
          expires_at: string | null;
          granted_by: string | null;
          id: string;
          region_id: string | null;
          role_id: string;
          user_id: string;
        };
        Insert: {
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          expires_at?: string | null;
          granted_by?: string | null;
          id?: string;
          region_id?: string | null;
          role_id: string;
          user_id: string;
        };
        Update: {
          community_id?: string | null;
          created_at?: string;
          district_id?: string | null;
          expires_at?: string | null;
          granted_by?: string | null;
          id?: string;
          region_id?: string | null;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["community_id"];
          },
          {
            foreignKeyName: "user_role_assignments_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["district_id"];
          },
          {
            foreignKeyName: "user_role_assignments_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "location_directory";
            referencedColumns: ["region_id"];
          },
          {
            foreignKeyName: "user_role_assignments_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      location_directory: {
        Row: {
          community_id: string | null;
          community_name: string | null;
          community_slug: string | null;
          district_id: string | null;
          district_name: string | null;
          district_slug: string | null;
          region_id: string | null;
          region_name: string | null;
          region_slug: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_trip: { Args: { p_trip: string }; Returns: undefined };
      active_advertisements: {
        Args: {
          p_community?: string;
          p_limit?: number;
          p_placement: Database["public"]["Enums"]["ad_placement"];
        };
        Returns: {
          body: string | null;
          clicks: number;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          entity_id: string;
          id: string;
          image_path: string | null;
          impressions: number;
          link_path: string | null;
          placement: Database["public"]["Enums"]["ad_placement"];
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          starts_on: string;
          status: Database["public"]["Enums"]["ad_status"];
          target_community_id: string | null;
          target_district_id: string | null;
          target_region_id: string | null;
          title: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "advertisements";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_assign_role: {
        Args: {
          p_community?: string;
          p_district?: string;
          p_expires_at?: string;
          p_region?: string;
          p_role_key: string;
          p_user: string;
        };
        Returns: string;
      };
      admin_broadcast_notification: {
        Args: {
          p_body: string;
          p_community?: string;
          p_district?: string;
          p_link?: string;
          p_region?: string;
          p_title: string;
        };
        Returns: number;
      };
      admin_list_users: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_search?: string;
          p_status?: Database["public"]["Enums"]["account_status"];
        };
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          display_name: string;
          email: string;
          home_community_id: string;
          id: string;
          is_demo: boolean;
          last_sign_in_at: string;
          role_keys: string[];
          total_count: number;
          username: string;
        }[];
      };
      admin_platform_stats: {
        Args: { p_community?: string; p_district?: string; p_region?: string };
        Returns: Json;
      };
      admin_review_rider: {
        Args: {
          p_reason?: string;
          p_rider: string;
          p_status: Database["public"]["Enums"]["rider_status"];
        };
        Returns: undefined;
      };
      admin_revoke_role: { Args: { p_assignment: string }; Returns: undefined };
      admin_set_account_status: {
        Args: {
          p_reason: string;
          p_status: Database["public"]["Enums"]["account_status"];
          p_user: string;
        };
        Returns: undefined;
      };
      admin_set_entity_capability: {
        Args: {
          p_capability: Database["public"]["Enums"]["entity_capability"];
          p_enabled: boolean;
          p_entity: string;
        };
        Returns: undefined;
      };
      admin_set_entity_status: {
        Args: {
          p_entity: string;
          p_reason: string;
          p_status: Database["public"]["Enums"]["entity_status"];
        };
        Returns: undefined;
      };
      alerts_for_community: {
        Args: { p_community: string; p_include_closed?: boolean };
        Returns: {
          body: string;
          category: Database["public"]["Enums"]["alert_category"];
          community_id: string | null;
          created_at: string;
          district_id: string | null;
          expires_at: string | null;
          id: string;
          instructions: string | null;
          issued_by: string | null;
          issuing_entity_id: string | null;
          region_id: string | null;
          resolved_at: string | null;
          severity: Database["public"]["Enums"]["alert_severity"];
          starts_at: string;
          status: Database["public"]["Enums"]["alert_status"];
          title: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "emergency_alerts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      available_riders: {
        Args: {
          p_community: string;
          p_kind?: Database["public"]["Enums"]["trip_kind"];
          p_vehicle?: Database["public"]["Enums"]["vehicle_type"];
        };
        Returns: {
          avatar_path: string;
          community_name: string;
          completed_trips: number;
          display_name: string;
          is_online: boolean;
          offers_delivery: boolean;
          offers_rides: boolean;
          phone: string;
          plate_number: string;
          rating_avg: number;
          rating_count: number;
          user_id: string;
          vehicle_description: string;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
          whatsapp: string;
        }[];
      };
      create_support_ticket: {
        Args: {
          p_body: string;
          p_category: Database["public"]["Enums"]["ticket_category"];
          p_entity?: string;
          p_subject: string;
        };
        Returns: string;
      };
      delete_my_account: { Args: { p_confirm: string }; Returns: string };
      entity_add_member: {
        Args: {
          p_email: string;
          p_entity: string;
          p_role: Database["public"]["Enums"]["membership_role"];
        };
        Returns: string;
      };
      entity_analytics: { Args: { p_entity: string }; Returns: Json };
      entity_capabilities: {
        Args: { p_entity: string };
        Returns: Database["public"]["Enums"]["entity_capability"][];
      };
      entity_public_features: {
        Args: { p_entity: string };
        Returns: {
          bookings: boolean;
          messages: boolean;
          reviews: boolean;
        }[];
      };
      entity_remove_member: { Args: { p_membership: string }; Returns: undefined };
      entity_unread_message_count: { Args: { p_entity: string }; Returns: number };
      entity_update_member_role: {
        Args: { p_membership: string; p_role: Database["public"]["Enums"]["membership_role"] };
        Returns: undefined;
      };
      fast_track_entity_application: { Args: { p_application: string }; Returns: string };
      issue_emergency_alert: {
        Args: {
          p_body: string;
          p_category: Database["public"]["Enums"]["alert_category"];
          p_community?: string;
          p_district?: string;
          p_entity?: string;
          p_expires_at?: string;
          p_instructions?: string;
          p_region?: string;
          p_severity: Database["public"]["Enums"]["alert_severity"];
          p_title: string;
        };
        Returns: string;
      };
      mark_all_notifications_read: { Args: Record<PropertyKey, never>; Returns: undefined };
      mark_conversation_read: { Args: { p_conversation: string }; Returns: undefined };
      moderate_content: {
        Args: {
          p_action: Database["public"]["Enums"]["moderation_action_type"];
          p_reason: string;
          p_report?: string;
          p_target: string;
          p_target_type: Database["public"]["Enums"]["moderation_target"];
        };
        Returns: undefined;
      };
      my_access: {
        Args: Record<PropertyKey, never>;
        Returns: {
          community_id: string;
          district_id: string;
          permission_key: string;
          region_id: string;
          scope: Database["public"]["Enums"]["scope_level"];
        }[];
      };
      my_unread_message_count: { Args: Record<PropertyKey, never>; Returns: number };
      my_workspaces: {
        Args: Record<PropertyKey, never>;
        Returns: {
          entity_id: string;
          entity_type: Database["public"]["Enums"]["entity_type"];
          logo_path: string;
          name: string;
          role: Database["public"]["Enums"]["membership_role"];
          slug: string;
          status: Database["public"]["Enums"]["entity_status"];
        }[];
      };
      open_trip_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          distance_km: number;
          dropoff_address: string;
          for_me: boolean;
          id: string;
          kind: Database["public"]["Enums"]["trip_kind"];
          note: string;
          offered_fare: number;
          package_description: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          pickup_address: string;
          pickup_km: number;
          trip_number: number;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
        }[];
      };
      place_order: {
        Args: {
          p_contact_phone: string;
          p_delivery_address?: string;
          p_entity: string;
          p_fulfilment: Database["public"]["Enums"]["fulfilment_method"];
          p_items: Json;
          p_note?: string;
        };
        Returns: string;
      };
      rate_trip: {
        Args: { p_comment?: string; p_rating: number; p_trip: string };
        Returns: undefined;
      };
      record_ad_click: { Args: { p_ad: string }; Returns: undefined };
      reply_support_ticket: { Args: { p_body: string; p_ticket: string }; Returns: string };
      request_booking: {
        Args: {
          p_date: string;
          p_note?: string;
          p_phone?: string;
          p_service: string;
          p_time?: string;
        };
        Returns: string;
      };
      request_trip: {
        Args: {
          p_community: string;
          p_customer_phone: string;
          p_dropoff_address: string;
          p_dropoff_lat?: number;
          p_dropoff_lng?: number;
          p_kind: Database["public"]["Enums"]["trip_kind"];
          p_note?: string;
          p_offered_fare: number;
          p_order?: string;
          p_package_description?: string;
          p_payment_method?: Database["public"]["Enums"]["payment_method"];
          p_pickup_address: string;
          p_pickup_lat?: number;
          p_pickup_lng?: number;
          p_preferred_rider?: string;
          p_recipient_name?: string;
          p_recipient_phone?: string;
          p_vehicle_type?: Database["public"]["Enums"]["vehicle_type"];
        };
        Returns: string;
      };
      respond_to_review: { Args: { p_response: string; p_review: string }; Returns: undefined };
      resubmit_entity_application: {
        Args: { p_application: string; p_note?: string };
        Returns: undefined;
      };
      review_advertisement: {
        Args: {
          p_ad: string;
          p_decision: Database["public"]["Enums"]["ad_status"];
          p_note?: string;
        };
        Returns: undefined;
      };
      review_entity_application: {
        Args: { p_action: string; p_application: string; p_internal?: boolean; p_note?: string };
        Returns: string;
      };
      search_directory: {
        Args: { p_community?: string; p_kinds?: string[]; p_limit?: number; p_query: string };
        Returns: {
          community_id: string;
          id: string;
          kind: string;
          rank: number;
          slug: string;
          subtitle: string;
          title: string;
        }[];
      };
      send_message: { Args: { p_body: string; p_conversation: string }; Returns: string };
      set_conversation_status: {
        Args: {
          p_conversation: string;
          p_status: Database["public"]["Enums"]["conversation_status"];
        };
        Returns: undefined;
      };
      set_job_application_status: {
        Args: {
          p_application: string;
          p_note?: string;
          p_status: Database["public"]["Enums"]["job_application_status"];
        };
        Returns: undefined;
      };
      set_rider_online: {
        Args: { p_lat?: number; p_lng?: number; p_online: boolean };
        Returns: undefined;
      };
      start_conversation: {
        Args: { p_body: string; p_entity: string; p_subject: string };
        Returns: string;
      };
      update_booking_status: {
        Args: {
          p_booking: string;
          p_note?: string;
          p_status: Database["public"]["Enums"]["booking_status"];
        };
        Returns: undefined;
      };
      update_emergency_alert_status: {
        Args: { p_alert: string; p_status: Database["public"]["Enums"]["alert_status"] };
        Returns: undefined;
      };
      update_order_status: {
        Args: {
          p_note?: string;
          p_order: string;
          p_status: Database["public"]["Enums"]["order_status"];
        };
        Returns: undefined;
      };
      update_report_status: {
        Args: {
          p_note?: string;
          p_report: string;
          p_status: Database["public"]["Enums"]["report_status"];
        };
        Returns: undefined;
      };
      update_support_ticket: {
        Args: {
          p_assignee?: string;
          p_priority?: string;
          p_status?: Database["public"]["Enums"]["ticket_status"];
          p_ticket: string;
          p_unassign?: boolean;
        };
        Returns: undefined;
      };
      update_trip_status: {
        Args: {
          p_final_fare?: number;
          p_reason?: string;
          p_status: Database["public"]["Enums"]["trip_status"];
          p_trip: string;
        };
        Returns: undefined;
      };
      withdraw_entity_application: { Args: { p_application: string }; Returns: undefined };
    };
    Enums: {
      account_status: "active" | "suspended" | "deactivated";
      ad_placement: "home_feed" | "explore" | "marketplace";
      ad_status: "draft" | "pending_review" | "approved" | "rejected" | "paused" | "archived";
      alert_category:
        | "fire"
        | "flood"
        | "health"
        | "security"
        | "weather"
        | "utility"
        | "road"
        | "missing_person"
        | "other";
      alert_severity: "info" | "advisory" | "warning" | "critical";
      alert_status: "active" | "resolved" | "cancelled";
      application_event_type:
        | "submitted"
        | "review_started"
        | "info_requested"
        | "resubmitted"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "note";
      application_status:
        "submitted" | "under_review" | "info_requested" | "approved" | "rejected" | "withdrawn";
      booking_status: "requested" | "confirmed" | "declined" | "cancelled" | "completed";
      content_status: "published" | "pending_review" | "hidden" | "removed";
      conversation_status: "open" | "closed" | "blocked";
      emergency_service:
        | "police"
        | "fire"
        | "ambulance"
        | "hospital"
        | "disaster_management"
        | "utility"
        | "community_leader"
        | "other";
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "temporary"
        | "internship"
        | "volunteer"
        | "apprenticeship";
      entity_capability:
        | "posts"
        | "products"
        | "services"
        | "jobs"
        | "events"
        | "media"
        | "members"
        | "analytics"
        | "advertising"
        | "orders"
        | "emergency_alerts"
        | "messages"
        | "bookings"
        | "reviews";
      entity_status: "active" | "suspended" | "archived";
      entity_type:
        | "business"
        | "cooperative"
        | "ngo"
        | "school"
        | "health_facility"
        | "government_agency"
        | "faith_organisation"
        | "community_group";
      event_status: "draft" | "published" | "cancelled" | "removed";
      fulfilment_method: "pickup" | "delivery";
      inquiry_status: "new" | "contacted" | "closed";
      job_application_status:
        "submitted" | "reviewing" | "shortlisted" | "rejected" | "hired" | "withdrawn";
      job_status: "draft" | "open" | "closed" | "archived" | "removed";
      listing_domain: "product" | "service" | "job" | "event";
      membership_role: "owner" | "manager" | "editor" | "member";
      moderation_action_type:
        "approve" | "hide" | "remove" | "restore" | "dismiss_report" | "warn_user";
      moderation_target:
        "post" | "comment" | "product" | "service" | "job" | "event" | "review" | "rental";
      order_status: "pending" | "confirmed" | "ready" | "completed" | "cancelled" | "declined";
      pay_period: "hour" | "day" | "week" | "month" | "year" | "fixed";
      payment_method: "cash" | "mobile_money";
      post_kind:
        | "general"
        | "question"
        | "recommendation"
        | "lost_and_found"
        | "announcement"
        | "poll"
        | "help_request"
        | "help_offer";
      product_status: "draft" | "active" | "out_of_stock" | "archived" | "removed";
      rental_period: "day" | "week" | "month" | "year";
      rental_status: "draft" | "available" | "rented" | "archived" | "removed";
      rental_type:
        | "room"
        | "self_contain"
        | "apartment"
        | "house"
        | "shop"
        | "office"
        | "warehouse"
        | "land"
        | "event_space";
      report_reason:
        | "spam"
        | "scam_or_fraud"
        | "harassment"
        | "hate_speech"
        | "violence"
        | "misinformation"
        | "inappropriate"
        | "impersonation"
        | "prohibited_item"
        | "other";
      report_status: "open" | "reviewing" | "resolved" | "dismissed";
      rider_status: "pending" | "approved" | "suspended" | "rejected";
      rsvp_status: "going" | "interested";
      scope_level: "platform" | "region" | "district" | "community";
      sector:
        | "commerce"
        | "agriculture"
        | "education"
        | "health"
        | "government"
        | "civil_society"
        | "faith"
        | "transport"
        | "hospitality"
        | "technology"
        | "finance"
        | "artisan"
        | "other";
      service_status: "draft" | "active" | "archived" | "removed";
      ticket_category:
        "account" | "verification" | "marketplace" | "safety" | "bug" | "feedback" | "other";
      ticket_status: "open" | "pending" | "resolved" | "closed";
      trip_kind: "ride" | "delivery";
      trip_status: "requested" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";
      vehicle_type: "motorbike" | "tricycle" | "car" | "van" | "bicycle";
      verification_document_type:
        | "business_registration"
        | "tax_certificate"
        | "operating_license"
        | "ngo_certificate"
        | "accreditation"
        | "identity_document"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "deactivated"],
      ad_placement: ["home_feed", "explore", "marketplace"],
      ad_status: ["draft", "pending_review", "approved", "rejected", "paused", "archived"],
      alert_category: [
        "fire",
        "flood",
        "health",
        "security",
        "weather",
        "utility",
        "road",
        "missing_person",
        "other",
      ],
      alert_severity: ["info", "advisory", "warning", "critical"],
      alert_status: ["active", "resolved", "cancelled"],
      application_event_type: [
        "submitted",
        "review_started",
        "info_requested",
        "resubmitted",
        "approved",
        "rejected",
        "withdrawn",
        "note",
      ],
      application_status: [
        "submitted",
        "under_review",
        "info_requested",
        "approved",
        "rejected",
        "withdrawn",
      ],
      booking_status: ["requested", "confirmed", "declined", "cancelled", "completed"],
      content_status: ["published", "pending_review", "hidden", "removed"],
      conversation_status: ["open", "closed", "blocked"],
      emergency_service: [
        "police",
        "fire",
        "ambulance",
        "hospital",
        "disaster_management",
        "utility",
        "community_leader",
        "other",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "temporary",
        "internship",
        "volunteer",
        "apprenticeship",
      ],
      entity_capability: [
        "posts",
        "products",
        "services",
        "jobs",
        "events",
        "media",
        "members",
        "analytics",
        "advertising",
        "orders",
        "emergency_alerts",
        "messages",
        "bookings",
        "reviews",
      ],
      entity_status: ["active", "suspended", "archived"],
      entity_type: [
        "business",
        "cooperative",
        "ngo",
        "school",
        "health_facility",
        "government_agency",
        "faith_organisation",
        "community_group",
      ],
      event_status: ["draft", "published", "cancelled", "removed"],
      fulfilment_method: ["pickup", "delivery"],
      inquiry_status: ["new", "contacted", "closed"],
      job_application_status: [
        "submitted",
        "reviewing",
        "shortlisted",
        "rejected",
        "hired",
        "withdrawn",
      ],
      job_status: ["draft", "open", "closed", "archived", "removed"],
      listing_domain: ["product", "service", "job", "event"],
      membership_role: ["owner", "manager", "editor", "member"],
      moderation_action_type: [
        "approve",
        "hide",
        "remove",
        "restore",
        "dismiss_report",
        "warn_user",
      ],
      moderation_target: [
        "post",
        "comment",
        "product",
        "service",
        "job",
        "event",
        "review",
        "rental",
      ],
      order_status: ["pending", "confirmed", "ready", "completed", "cancelled", "declined"],
      pay_period: ["hour", "day", "week", "month", "year", "fixed"],
      payment_method: ["cash", "mobile_money"],
      post_kind: [
        "general",
        "question",
        "recommendation",
        "lost_and_found",
        "announcement",
        "poll",
        "help_request",
        "help_offer",
      ],
      product_status: ["draft", "active", "out_of_stock", "archived", "removed"],
      rental_period: ["day", "week", "month", "year"],
      rental_status: ["draft", "available", "rented", "archived", "removed"],
      rental_type: [
        "room",
        "self_contain",
        "apartment",
        "house",
        "shop",
        "office",
        "warehouse",
        "land",
        "event_space",
      ],
      report_reason: [
        "spam",
        "scam_or_fraud",
        "harassment",
        "hate_speech",
        "violence",
        "misinformation",
        "inappropriate",
        "impersonation",
        "prohibited_item",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      rider_status: ["pending", "approved", "suspended", "rejected"],
      rsvp_status: ["going", "interested"],
      scope_level: ["platform", "region", "district", "community"],
      sector: [
        "commerce",
        "agriculture",
        "education",
        "health",
        "government",
        "civil_society",
        "faith",
        "transport",
        "hospitality",
        "technology",
        "finance",
        "artisan",
        "other",
      ],
      service_status: ["draft", "active", "archived", "removed"],
      ticket_category: [
        "account",
        "verification",
        "marketplace",
        "safety",
        "bug",
        "feedback",
        "other",
      ],
      ticket_status: ["open", "pending", "resolved", "closed"],
      trip_kind: ["ride", "delivery"],
      trip_status: ["requested", "accepted", "arrived", "in_progress", "completed", "cancelled"],
      vehicle_type: ["motorbike", "tricycle", "car", "van", "bicycle"],
      verification_document_type: [
        "business_registration",
        "tax_certificate",
        "operating_license",
        "ngo_certificate",
        "accreditation",
        "identity_document",
        "other",
      ],
    },
  },
} as const;
