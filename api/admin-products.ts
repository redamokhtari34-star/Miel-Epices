import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { verifyAdminToken, extractBearerToken } from './_lib/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }

  const token = extractBearerToken(req.headers.authorization as string | undefined);
  if (!verifyAdminToken(token)) {
    return sendJson(res, 401, { error: 'Non autorisé.' });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      if (!body.name || !String(body.name).trim()) {
        return sendJson(res, 400, { error: 'Le nom du produit est requis.' });
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
      if (error) return sendJson(res, 500, { error: error.message });
      return sendJson(res, 201, { product: data });
    } catch (err: any) {
      return sendJson(res, 400, { error: err.message || 'Requête invalide.' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { productId, price, stock, image, name, category, description, longDescription, ingredients, conservation, badge } = req.body || {};
      if (!productId) return sendJson(res, 400, { error: 'productId requis.' });

      const updates: Record<string, number | string | string[] | null> = {};
      if (price !== undefined) updates.price = Math.max(0, Number(price));
      if (stock !== undefined) updates.stock = Math.max(0, Number(stock));
      if (image !== undefined && String(image).trim()) updates.image = String(image).trim();
      if (name !== undefined && String(name).trim()) updates.name = String(name).trim();
      if (category !== undefined && ['amande', 'noix', 'assortiment'].includes(category)) updates.category = category;
      if (description !== undefined) updates.description = String(description).trim();
      if (longDescription !== undefined) updates.long_description = String(longDescription).trim();
      if (conservation !== undefined) updates.conservation = String(conservation).trim();
      if (badge !== undefined) updates.badge = String(badge).trim() || null;
      if (ingredients !== undefined) {
        const parsedIngredients = Array.isArray(ingredients)
          ? ingredients
          : String(ingredients || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
        if (parsedIngredients.length > 0) updates.ingredients = parsedIngredients;
      }

      const { data, error } = await supabase
        .from('me_products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) return sendJson(res, 500, { error: error.message });
      return sendJson(res, 200, { product: data });
    } catch (err: any) {
      return sendJson(res, 400, { error: err.message || 'Requête invalide.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { productId } = req.body || {};
      if (!productId) return sendJson(res, 400, { error: 'productId requis.' });

      const { error } = await supabase.from('me_products').delete().eq('id', productId);
      if (error) return sendJson(res, 500, { error: error.message });
      return sendJson(res, 200, { success: true });
    } catch (err: any) {
      return sendJson(res, 400, { error: err.message || 'Requête invalide.' });
    }
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
}
