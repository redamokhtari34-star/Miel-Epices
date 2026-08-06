import { Handler } from '@netlify/functions';
import { corsHeaders, jsonResponse, getSupabaseAdmin } from './_shared/supabaseAdmin';
import { verifyAdminToken, extractBearerToken } from './_shared/adminAuth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const token = extractBearerToken(event.headers.authorization);
  if (!verifyAdminToken(token)) {
    return jsonResponse(401, { error: 'Non autorisé.' });
  }

  const supabase = getSupabaseAdmin();

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      if (!body.name || !body.name.trim()) {
        return jsonResponse(400, { error: 'Le nom du produit est requis.' });
      }

      const ingredients = Array.isArray(body.ingredients)
        ? body.ingredients
        : String(body.ingredients || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

      const product = {
        id: `prod-${Date.now()}`,
        name: String(body.name).trim(),
        category: ['amande', 'noix', 'assortiment'].includes(body.category) ? body.category : 'amande',
        price: Math.max(0, Number(body.price) || 0),
        stock: Math.max(0, Number(body.stock) || 0),
        description: String(body.description || '').trim(),
        long_description: String(body.longDescription || body.description || '').trim(),
        ingredients: ingredients.length > 0 ? ingredients : ['Amandes', "Miel d'oranger", 'Beurre clarifié', 'Pâte filo'],
        conservation: String(body.conservation || "Conserver à l'abri de l'humidité et de la chaleur.").trim(),
        image: String(body.image || '').trim(),
        rating: 5.0,
        reviews_count: 0,
        badge: body.badge ? String(body.badge).trim() : null,
      };

      const { data, error } = await supabase.from('me_products').insert(product).select().single();
      if (error) return jsonResponse(500, { error: error.message });
      return jsonResponse(201, { product: data });
    } catch (err: any) {
      return jsonResponse(400, { error: err.message || 'Requête invalide.' });
    }
  }

  if (event.httpMethod === 'PATCH') {
    try {
      const { productId, price, stock, image } = JSON.parse(event.body || '{}');
      if (!productId) return jsonResponse(400, { error: 'productId requis.' });

      const updates: Record<string, number | string> = {};
      if (price !== undefined) updates.price = Math.max(0, Number(price));
      if (stock !== undefined) updates.stock = Math.max(0, Number(stock));
      if (image !== undefined && String(image).trim()) updates.image = String(image).trim();

      const { data, error } = await supabase
        .from('me_products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) return jsonResponse(500, { error: error.message });
      return jsonResponse(200, { product: data });
    } catch (err: any) {
      return jsonResponse(400, { error: err.message || 'Requête invalide.' });
    }
  }

  if (event.httpMethod === 'DELETE') {
    try {
      const { productId } = JSON.parse(event.body || '{}');
      if (!productId) return jsonResponse(400, { error: 'productId requis.' });

      const { error } = await supabase.from('me_products').delete().eq('id', productId);
      if (error) return jsonResponse(500, { error: error.message });
      return jsonResponse(200, { success: true });
    } catch (err: any) {
      return jsonResponse(400, { error: err.message || 'Requête invalide.' });
    }
  }

  return jsonResponse(405, { error: 'Method Not Allowed' });
};
