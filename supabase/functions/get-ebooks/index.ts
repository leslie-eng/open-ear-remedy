import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetEbooksParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'title' | 'price' | 'publication_date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

interface Ebook {
  id: string;
  title: string;
  author: string;
  description: string;
  short_description: string;
  price: number;
  category: string;
  cover_image_url: string;
  file_url: string;
  file_format: 'PDF' | 'EPUB';
  file_size: number;
  publication_date: string;
  isbn?: string;
  sample_pages_url?: string;
  created_at: string;
  updated_at: string;
}

interface GetEbooksResponse {
  ebooks: Ebook[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse query parameters
    const url = new URL(req.url);
    const params: GetEbooksParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 100), // Max 100 items per page
      search: url.searchParams.get('search') || undefined,
      category: url.searchParams.get('category') || undefined,
      minPrice: url.searchParams.get('minPrice') ? parseFloat(url.searchParams.get('minPrice')!) : undefined,
      maxPrice: url.searchParams.get('maxPrice') ? parseFloat(url.searchParams.get('maxPrice')!) : undefined,
      sortBy: (url.searchParams.get('sortBy') as GetEbooksParams['sortBy']) || 'title',
      sortOrder: (url.searchParams.get('sortOrder') as GetEbooksParams['sortOrder']) || 'asc',
    };

    // Validate parameters
    if (params.page! < 1) params.page = 1;
    if (params.limit! < 1) params.limit = 20;
    if (params.minPrice !== undefined && params.minPrice < 0) params.minPrice = 0;
    if (params.maxPrice !== undefined && params.maxPrice < 0) params.maxPrice = undefined;
    if (params.minPrice !== undefined && params.maxPrice !== undefined && params.minPrice > params.maxPrice) {
      const temp = params.minPrice;
      params.minPrice = params.maxPrice;
      params.maxPrice = temp;
    }

    // Build the query
    let query = supabaseClient
      .from('ebooks')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply search filter
    if (params.search) {
      const searchTerm = params.search.trim();
      if (searchTerm) {
        // Use full-text search for better performance
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    }

    // Apply category filter
    if (params.category) {
      query = query.eq('category', params.category);
    }

    // Apply price range filters
    if (params.minPrice !== undefined) {
      query = query.gte('price', params.minPrice);
    }
    if (params.maxPrice !== undefined) {
      query = query.lte('price', params.maxPrice);
    }

    // Apply sorting
    const sortColumn = params.sortBy === 'popularity' ? 'created_at' : params.sortBy; // Use created_at as proxy for popularity for now
    query = query.order(sortColumn!, { ascending: params.sortOrder === 'asc' });

    // Apply pagination
    const offset = (params.page! - 1) * params.limit!;
    query = query.range(offset, offset + params.limit! - 1);

    // Execute query
    const { data: ebooks, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to retrieve ebooks');
    }

    // Calculate pagination metadata
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / params.limit!);
    const currentPage = params.page!;
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    const response: GetEbooksResponse = {
      ebooks: ebooks || [],
      totalCount,
      currentPage,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        } 
      }
    );

  } catch (error) {
    console.error('Get ebooks error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        ebooks: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});