export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: 'customer' | 'admin' | 'super_admin';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: 'customer' | 'admin' | 'super_admin';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: 'customer' | 'admin' | 'super_admin';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          is_sample: boolean;
          category: string;
          price_ngn: number;
          description: string;
          fabric_and_care: string;
          images: string[];
          sizes: string[];
          colors: Json;
          stock_status: string;
          stock_quantity: number;
          is_featured: boolean;
          is_new_arrival: boolean;
          is_best_seller: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          is_sample?: boolean;
          category: string;
          price_ngn: number;
          description: string;
          fabric_and_care?: string;
          images: string[];
          sizes: string[];
          colors: Json;
          stock_status: string;
          stock_quantity?: number;
          is_featured?: boolean;
          is_new_arrival?: boolean;
          is_best_seller?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          is_sample?: boolean;
          category?: string;
          price_ngn?: number;
          description?: string;
          fabric_and_care?: string;
          images?: string[];
          sizes?: string[];
          colors?: Json;
          stock_status?: string;
          stock_quantity?: number;
          is_featured?: boolean;
          is_new_arrival?: boolean;
          is_best_seller?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          reference_code: string;
          customer_id: string | null;
          customer_name: string;
          phone_number: string;
          email: string | null;
          delivery_address: string;
          city_state: string;
          delivery_notes: string | null;
          subtotal_ngn: number;
          delivery_fee_ngn: number;
          total_amount_ngn: number;
          status: string;
          payment_status: string;
          internal_notes: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_code: string;
          customer_id?: string | null;
          customer_name: string;
          phone_number: string;
          email?: string | null;
          delivery_address: string;
          city_state: string;
          delivery_notes?: string | null;
          subtotal_ngn: number;
          delivery_fee_ngn?: number;
          total_amount_ngn: number;
          status?: string;
          payment_status?: string;
          internal_notes?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference_code?: string;
          customer_id?: string | null;
          customer_name?: string;
          phone_number?: string;
          email?: string | null;
          delivery_address?: string;
          city_state?: string;
          delivery_notes?: string | null;
          subtotal_ngn?: number;
          delivery_fee_ngn?: number;
          total_amount_ngn?: number;
          status?: string;
          payment_status?: string;
          internal_notes?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          category: string;
          product_image: string;
          selected_size: string;
          selected_color: string;
          unit_price_ngn: number;
          quantity: number;
          line_total_ngn: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          category: string;
          product_image?: string;
          selected_size: string;
          selected_color: string;
          unit_price_ngn: number;
          quantity: number;
          line_total_ngn: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          category?: string;
          product_image?: string;
          selected_size?: string;
          selected_color?: string;
          unit_price_ngn?: number;
          quantity?: number;
          line_total_ngn?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      custom_orders: {
        Row: {
          id: string;
          reference_code: string;
          customer_id: string | null;
          customer_name: string;
          contact_number: string;
          email: string | null;
          outfit_type: string;
          outfit_description: string;
          preferred_fabric: string | null;
          preferred_color: string;
          preferred_occasion: string | null;
          preferred_delivery_date: string;
          budget_ngn: number | null;
          standard_size_reference: string | null;
          measurement_unit: string;
          measurements: Json;
          additional_notes: string | null;
          reference_image_name: string | null;
          reference_image_path: string | null;
          status: string;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_code: string;
          customer_id?: string | null;
          customer_name: string;
          contact_number: string;
          email?: string | null;
          outfit_type: string;
          outfit_description: string;
          preferred_fabric?: string | null;
          preferred_color: string;
          preferred_occasion?: string | null;
          preferred_delivery_date: string;
          budget_ngn?: number | null;
          standard_size_reference?: string | null;
          measurement_unit?: string;
          measurements?: Json;
          additional_notes?: string | null;
          reference_image_name?: string | null;
          reference_image_path?: string | null;
          status?: string;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference_code?: string;
          customer_id?: string | null;
          customer_name?: string;
          contact_number?: string;
          email?: string | null;
          outfit_type?: string;
          outfit_description?: string;
          preferred_fabric?: string | null;
          preferred_color?: string;
          preferred_occasion?: string | null;
          preferred_delivery_date?: string;
          budget_ngn?: number | null;
          standard_size_reference?: string | null;
          measurement_unit?: string;
          measurements?: Json;
          additional_notes?: string | null;
          reference_image_name?: string | null;
          reference_image_path?: string | null;
          status?: string;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_inquiries: {
        Row: {
          id: string;
          customer_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          status: string;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          status?: string;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string;
          message?: string;
          status?: string;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      website_settings: {
        Row: {
          id: number;
          brand_name: string;
          tagline: string;
          whatsapp_number_raw: string;
          whatsapp_display_label: string;
          whatsapp_is_placeholder: boolean;
          business_email: string;
          business_phone: string;
          instagram_handle: string;
          instagram_url: string;
          business_location: string;
          business_hours: string;
          currency_code: string;
          currency_symbol: string;
          currency_label: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          brand_name?: string;
          tagline?: string;
          whatsapp_number_raw?: string;
          whatsapp_display_label?: string;
          whatsapp_is_placeholder?: boolean;
          business_email?: string;
          business_phone?: string;
          instagram_handle?: string;
          instagram_url?: string;
          business_location?: string;
          business_hours?: string;
          currency_code?: string;
          currency_symbol?: string;
          currency_label?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          brand_name?: string;
          tagline?: string;
          whatsapp_number_raw?: string;
          whatsapp_display_label?: string;
          whatsapp_is_placeholder?: boolean;
          business_email?: string;
          business_phone?: string;
          instagram_handle?: string;
          instagram_url?: string;
          business_location?: string;
          business_hours?: string;
          currency_code?: string;
          currency_symbol?: string;
          currency_label?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      verify_admin_access: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      create_verified_order: {
        Args: {
          p_customer_name: string;
          p_phone_number: string;
          p_email: string | null;
          p_delivery_address: string;
          p_city_state: string;
          p_delivery_notes: string | null;
          p_items: Json;
        };
        Returns: Json;
      };
      submit_custom_order: {
        Args: {
          p_customer_name: string;
          p_contact_number: string;
          p_email: string | null;
          p_outfit_type: string;
          p_outfit_description: string;
          p_preferred_fabric: string | null;
          p_preferred_color: string;
          p_preferred_occasion: string | null;
          p_preferred_delivery_date: string;
          p_budget_ngn: number | null;
          p_standard_size_reference: string | null;
          p_measurement_unit: string;
          p_measurements: Json;
          p_additional_notes: string | null;
          p_reference_image_name: string | null;
          p_reference_image_path: string | null;
        };
        Returns: Json;
      };
      submit_contact_inquiry: {
        Args: {
          p_name: string;
          p_email: string;
          p_phone: string | null;
          p_subject: string;
          p_message: string;
        };
        Returns: Json;
      };
      delete_product_safely: {
        Args: {
          p_product_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
