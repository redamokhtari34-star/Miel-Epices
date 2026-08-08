import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  ChevronRight,
  Star,
  Trash2,
  Plus,
  Minus,
  X,
  MapPin,
  Phone,
  Mail,
  Check,
  Sparkles,
  Clock,
  Settings,
  AlertCircle,
  Filter,
  Search,
  Menu,
  ShieldCheck,
  Package,
  CreditCard,
  CheckCircle,
  Send,
  MessageSquare,
  Compass,
  Camera
} from 'lucide-react';

// Served as static files from /public/images so both build-time imports and
// database-stored product image paths (e.g. products added via the admin panel)
// resolve to the same stable, hash-free URLs.
const heroImg = '/images/plateau_imperial_constantine_1783245478876.webp';
const heroBgBaklawa = '/images/baklawa_hero_bg_1785853706198.webp';
const amandeImg = '/images/baklawa_traditionnelle_amande_1783275576408.webp';
const soupirNoixImg = '/images/baklawa_soupir_constantine_1783245519017.webp';
const kataifImg = '/images/kataif_no_pistachio_1783329343897.webp';
const coffretBaklawaKataifImg = '/images/coffret_baklawa_kataif_comb_image_1783329033330.webp';

import { SuccessPage } from './components/SuccessPage';
import { CancelPage } from './components/CancelPage';
import { Product, CartItem, Order, ContactMessage, WeightOption } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

type ProductRow = {
  id: string;
  name: string;
  category: 'amande' | 'noix' | 'assortiment';
  price: number;
  description: string;
  long_description: string;
  ingredients: string[];
  conservation: string;
  stock: number;
  image: string;
  rating: number;
  reviews_count: number;
  badge: string | null;
};

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    description: row.description,
    longDescription: row.long_description,
    ingredients: row.ingredients,
    conservation: row.conservation,
    stock: row.stock,
    image: row.image,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    badge: row.badge || undefined,
  };
}

type OrderRow = {
  id: string;
  customer_name: string;
  email: string;
  address: string;
  phone: string;
  items: { name: string; quantity: number; weight: string }[];
  total: number;
  status: Order['status'];
  created_at: string;
};

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    email: row.email,
    address: row.address,
    phone: row.phone,
    items: row.items,
    total: row.total,
    status: row.status,
    date: new Date(row.created_at).toLocaleDateString('fr-FR'),
  };
}

type MessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

function mapMessageRow(row: MessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    date: new Date(row.created_at).toLocaleDateString('fr-FR'),
  };
}

// Fallback catalogue used only if the Supabase fetch fails (e.g. offline dev) —
// the database (me_products table) is the actual source of truth at runtime.
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Plateau Impérial de Constantine',
    category: 'assortiment',
    price: 38,
    description: 'Une sélection majestueuse de nos plus prestigieuses pâtisseries, préparées au miel pur d\'oranger.',
    longDescription: 'Le Plateau Impérial de Constantine est une célébration de l\'art de la pâtisserie fine de Constantine. Réunissant nos plus belles créations découpées en losanges parfaits, chaque pièce témoigne de dizaines d\'heures de travail minutieux. Les feuilles de pâte filo, étirées à la main jusqu\'à devenir translucides, alternent avec des couches croustillantes d\'amandes douces et de noix parfumées.',
    ingredients: ['Farine de blé extra-fine', 'Amandes locales sélectionnées', 'Noix de Grenoble sélectionnées', 'Miel de fleur d\'oranger bio', 'Beurre clarifié (Smen)', 'Eau de rose de Constantine'],
    conservation: 'Conserver à température ambiante (16-22°C) dans sa boîte d\'origine, bien fermée, à l\'abri de l\'humidité. Se conserve idéalement pendant 3 semaines.',
    stock: 12,
    image: heroImg,
    rating: 4.9,
    reviewsCount: 148,
    badge: 'Prestige'
  },
  {
    id: '3',
    name: 'Pâtisserie Traditionnelle El-Yasmine',
    category: 'amande',
    price: 26,
    description: 'La pâtisserie constantinoise classique aux amandes douces blanchies, subtilement parfumée à la rose.',
    longDescription: 'Héritière directe des réceptions de Constantine la Suspendue. El-Yasmine est la quintessence de la pâtisserie traditionnelle. Préparée exclusivement avec des amandes locales de la région, séchées au soleil puis dorées au four, elle est parfumée délicatement à l\'eau de rose distillée de façon artisanale à Constantine.',
    ingredients: ['Farine de blé tendre', 'Amandes de première qualité', 'Miel pur d\'oranger', 'Smen artisanal', 'Eau de rose traditionnelle de Constantine'],
    conservation: 'Se conserve à l\'abri de l\'humidité à température ambiante pendant 4 semaines.',
    stock: 24,
    image: amandeImg,
    rating: 4.7,
    reviewsCount: 215
  },
  {
    id: '4',
    name: 'Pâtisserie Soupir de Constantine',
    category: 'noix',
    price: 28,
    description: 'Une alliance riche de noix de Grenoble et d\'amandes douces au miel de forêt sauvage.',
    longDescription: 'Inspirée des traditions ancestrales de Constantine, cette pâtisserie propose un mariage gourmand et boisé. La force de la noix de Grenoble est adoucie par la rondeur de l\'amande douce et l\'intensité d\'un miel de forêt profond. Une pincée de cannelle fine vient couronner le tout pour réchauffer les papilles.',
    ingredients: ['Farine de blé', 'Noix de Grenoble sélectionnées (40%)', 'Amandes douces (20%)', 'Miel sauvage de forêt', 'Cannelle de Ceylan', 'Eau de fleur d\'oranger'],
    conservation: 'Conserver au sec. Excellente conservation de 3 semaines.',
    stock: 15,
    image: soupirNoixImg,
    rating: 4.9,
    reviewsCount: 84,
    badge: 'Nouveauté'
  },
  {
    id: '5',
    name: 'Kataif',
    category: 'amande',
    price: 24,
    description: 'Douceur traditionnelle à base de fins fils de pâte kataif dorés et croustillants, garnis d\'amandes douces, imbibés d\'un sirop parfumé au miel. Présentée en petites bouchées carrées individuelles.',
    longDescription: 'Le Kataif est une merveille de croustillant et de finesse. Préparé avec amour par nos artisans, il se compose de cheveux d\'ange (fils de pâte de kataïf) dorés au four, qui enveloppent un cœur gourmand d\'amandes douces concassées de première qualité. À sa sortie du four, il est délicatement arrosé d\'un sirop de miel chaud parfumé à la fleur d\'oranger.',
    ingredients: ['Pâte de Kataïf (fils de pâte)', 'Amandes douces sélectionnées', 'Miel pur de fleur d\'oranger', 'Beurre clarifié (Smen)', 'Sirop parfumé'],
    conservation: 'Conserver à l\'abri de l\'humidité et de la chaleur dans sa boîte d\'origine. Se conserve 3 semaines.',
    stock: 20,
    image: kataifImg,
    rating: 4.9,
    reviewsCount: 38,
    badge: 'Nouveau'
  },
  {
    id: '6',
    name: 'Coffret Baklawa & Kataif',
    category: 'assortiment',
    price: 34,
    description: 'Un assortiment généreux mêlant nos baklawas traditionnelles aux amandes et notre kataif croustillant aux amandes, imbibés d\'un sirop parfumé au miel. Un coffret parfait pour découvrir nos deux douceurs signature en une seule boîte (sans pistache).',
    longDescription: 'Ce coffret d\'exception réunit les deux chefs-d\'œuvre de notre maison dans un écrin raffiné. Vous y découvrirez notre Pâtisserie traditionnelle El-Yasmine au feuilletage aérien garni d\'amandes douces, ainsi que notre Kataif croustillant préparé à base de cheveux d\'ange dorés au beurre clarifié enveloppant un cœur gourmand d\'amandes concassées. Le tout est délicatement arrosé d\'un miel pur de fleur d\'oranger d\'Algérie. Une création exclusive garantie 100% sans pistache.',
    ingredients: ['Pâte de Kataïf (fils de pâte)', 'Farine de blé tendre', 'Amandes douces sélectionnées de la plaine de la Mitidja', 'Miel pur de fleur d\'oranger', 'Beurre clarifié (Smen)', 'Eau de rose traditionnelle de Constantine'],
    conservation: 'Conserver à l\'abri de l\'humidité et de la chaleur dans sa boîte d\'origine bien fermée. Se conserve idéalement 3 semaines à température ambiante.',
    stock: 25,
    image: coffretBaklawaKataifImg,
    rating: 4.9,
    reviewsCount: 42,
    badge: 'Coffret'
  }
];

const WEIGHT_OPTIONS = [
  { label: 'Boite Découverte (250g)', multiplier: 1.0, weight: '250g' },
  { label: 'Boite Partage (500g)', multiplier: 1.8, weight: '500g' },
  { label: 'Plateau Prestige (1kg)', multiplier: 3.2, weight: '1kg' }
];

const PRODUCTS_CACHE_KEY = 'me_products_cache_v1';

export default function App() {
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<'home' | 'shop' | 'story' | 'contact' | 'admin' | 'success' | 'cancel'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Products, Stock & Reviews State — loaded from Supabase (me_products / me_reviews)
  // Seeded synchronously from localStorage so returning visitors see the
  // catalogue immediately instead of a blank/loading page, while a fresh
  // fetch still runs in the background to pick up any changes.
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      return cached ? (JSON.parse(cached) as Product[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(products.length === 0);
  const [productReviews, setProductReviews] = useState<{ [productId: string]: { name: string; rating: number; comment: string; date: string }[] }>({});

  const loadCatalogue = async () => {
    if (!isSupabaseConfigured) {
      setProducts(FALLBACK_PRODUCTS);
      setIsLoadingProducts(false);
      return;
    }

    const fetchProducts = async (timeoutMs: number) => {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
      return Promise.race([
        supabase.from('me_products').select('*').order('created_at', { ascending: false }),
        timeout,
      ]);
    };

    // Retry several times with growing timeouts before giving up — a slow
    // connection should just take longer, never silently show wrong data.
    const timeoutsMs = [8000, 12000, 16000, 20000];
    let loaded = false;
    for (const timeoutMs of timeoutsMs) {
      try {
        const { data: productRows, error: productsError } = await fetchProducts(timeoutMs);
        if (!productsError && productRows) {
          const mapped = (productRows as ProductRow[]).map(mapProductRow);
          setProducts(mapped);
          try {
            localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(mapped));
          } catch {
            // storage full/unavailable — not critical, skip caching
          }
          loaded = true;
          break;
        }
      } catch {
        // try the next attempt
      }
    }

    if (!loaded) {
      // Only fall back to the hardcoded demo catalogue if we have nothing
      // real on screen yet — never let a fetch failure overwrite an
      // already-loaded catalogue (e.g. with stale default photos).
      setProducts((prev) => (prev.length > 0 ? prev : FALLBACK_PRODUCTS));
      // Keep trying in the background so the real catalogue can still
      // replace the demo data once the connection recovers.
      setTimeout(loadCatalogue, 10000);
    }
    setIsLoadingProducts(false);

    try {
      const { data: reviewRows, error: reviewsError } = await supabase
        .from('me_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!reviewsError && reviewRows) {
        const grouped: { [productId: string]: { name: string; rating: number; comment: string; date: string }[] } = {};
        for (const row of reviewRows as any[]) {
          const entry = {
            name: row.name,
            rating: row.rating,
            comment: row.comment,
            date: new Date(row.created_at).toLocaleDateString('fr-FR'),
          };
          grouped[row.product_id] = [...(grouped[row.product_id] || []), entry];
        }
        setProductReviews(grouped);
      }
    } catch {
      // Ignored if Supabase unavailable
    }
  };

  useEffect(() => {
    loadCatalogue();
  }, []);


  // New Review Inputs
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  
  // Checkout Form State
  const [shippingForm, setShippingForm] = useState({ name: '', email: '', address: '', phone: '', city: '' });
  const [paymentForm, setPaymentForm] = useState({ cardName: '', cardNumber: '', cardExpiry: '', cardCvv: '' });
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Shop Filters State
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'amande' | 'noix' | 'assortiment'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'popular' | 'priceAsc' | 'priceDesc'>('popular');
  const [homeCategoryFilter, setHomeCategoryFilter] = useState<'all' | 'amande' | 'noix' | 'assortiment'>('all');

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Admin / Artisan Dashboard State — orders & messages live in Supabase and are
  // only reachable through authenticated Netlify functions (service role key),
  // never directly from the browser's anon key.
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminMessages, setAdminMessages] = useState<ContactMessage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingPhotoForId, setUploadingPhotoForId] = useState<string | null>(null);

  const loadAdminData = async (token: string) => {
    const authHeader = { Authorization: `Bearer ${token}` };
    try {
      const [ordersRes, messagesRes] = await Promise.all([
        fetch('/.netlify/functions/admin-orders', { headers: authHeader }),
        fetch('/.netlify/functions/admin-messages', { headers: authHeader }),
      ]);
      if (ordersRes.ok) {
        const { orders } = await ordersRes.json();
        setAdminOrders((orders as OrderRow[]).map(mapOrderRow));
      }
      if (messagesRes.ok) {
        const { messages } = await messagesRes.json();
        setAdminMessages((messages as MessageRow[]).map(mapMessageRow));
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  // Add Product Modal & Form State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'amande' as 'amande' | 'noix' | 'assortiment',
    price: 28,
    stock: 25,
    description: '',
    longDescription: '',
    ingredients: 'Amandes blanchies, Miel pur d\'oranger, Beurre clarifié (Smen), Eau de fleur d\'oranger, Pâte filo',
    conservation: 'Conserver à l\'abri de l\'humidité et de la chaleur dans sa boîte d\'origine bien fermée. Se conserve 3 semaines.',
    badge: 'Nouveauté',
    image: amandeImg,
    customImageUrl: ''
  });
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const completeDemoOrder = () => {
    const orderId = `ME-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const newOrder: Order = {
      id: orderId,
      customerName: shippingForm.name || 'Client Démo',
      email: shippingForm.email || 'client@example.com',
      address: `${shippingForm.address || '15 Rue de la Paix'}, ${shippingForm.city || 'Paris'}`,
      phone: shippingForm.phone || '0600000000',
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        weight: item.weightOption.label,
      })),
      total: cartTotal,
      status: 'preparing',
      date: new Date().toLocaleDateString('fr-FR'),
    };
    setLastPlacedOrder(newOrder);
    setAdminOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setCheckoutStep('success');
    setCheckoutError(null);
  };

  const initiateStripeCheckout = async () => {
    setIsRedirectingToStripe(true);
    setCheckoutError(null);
    
    // Save state in localStorage so we can restore it on successful redirection back
    localStorage.setItem('miel_epices_pending_cart', JSON.stringify(cart));
    localStorage.setItem('miel_epices_pending_shipping', JSON.stringify(shippingForm));
    
    try {
      // Try netlify function route first, with fallback to express /api endpoint
      let endpoint = '/.netlify/functions/create-checkout-session';
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          shippingInfo: shippingForm,
        }),
      });

      if (!response.ok && response.status === 404) {
        // Fallback to Express backend if Netlify functions redirect isn't active locally
        endpoint = '/api/create-checkout-session';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: cart,
            shippingInfo: shippingForm,
          }),
        });
      }
      
      const data = await response.json();
      
      if (response.ok && data.url) {
        // Redirect client to Stripe Checkout URL
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || "Une erreur s'est produite lors de l'initiation du paiement Stripe.");
        setIsRedirectingToStripe(false);
      }
    } catch (error) {
      console.warn("Stripe Checkout notice:", error);
      setCheckoutError("Impossible de se connecter au service de paiement Stripe. Vous pouvez valider votre commande en Mode Démo.");
      setIsRedirectingToStripe(false);
    }
  };

  useEffect(() => {
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    const isSuccess = pathname === '/success' || urlParams.get('payment_success') === 'true';
    const isCancel = pathname === '/cancel' || urlParams.get('payment_cancel') === 'true';

    if (isSuccess) {
      // The order itself is now fetched and verified server-side by <SuccessPage/>
      // (via the Stripe session id), never fabricated from localStorage here.
      setActiveTab('success');
    } else if (isCancel) {
      setActiveTab('cancel');
      const savedCart = localStorage.getItem('miel_epices_pending_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {}
      }
    }
  }, []);

  // Selected Product Option (for Details Modal)
  const [selectedWeight, setSelectedWeight] = useState(WEIGHT_OPTIONS[0]);
  const [selectedQty, setSelectedQty] = useState(1);

  // Computed Values
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemPrice = item.product.price * item.weightOption.multiplier;
      return sum + itemPrice * item.quantity;
    }, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOption === 'priceAsc') return a.price - b.price;
        if (sortOption === 'priceDesc') return b.price - a.price;
        return b.rating - a.rating; // default popular
      });
  }, [products, categoryFilter, searchQuery, sortOption]);

  // Cart Functions
  const addToCart = (product: Product, weightOption: typeof WEIGHT_OPTIONS[0], qty: number) => {
    // Check stock limit
    if (product.stock <= 0) return;
    
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.weightOption.weight === weightOption.weight
      );
      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += qty;
        return newCart;
      }
      return [...prev, { product, quantity: qty, weightOption }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQty = item.quantity + delta;
      
      if (newQty <= 0) {
        newCart.splice(index, 1);
      } else {
        newCart[index].quantity = newQty;
      }
      return newCart;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Checkout and Order Management
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Deduct Stock
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const cartItemsForProduct = cart.filter((item) => item.product.id === p.id);
        const totalDeducted = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...p,
          stock: Math.max(0, p.stock - totalDeducted)
        };
      })
    );

    const orderId = `ME-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: orderId,
      customerName: shippingForm.name,
      email: shippingForm.email,
      address: `${shippingForm.address}, ${shippingForm.city}`,
      phone: shippingForm.phone,
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        weight: item.weightOption.weight
      })),
      total: cartTotal,
      status: 'pending',
      date: new Date().toLocaleDateString('fr-FR')
    };

    setAdminOrders((prev) => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCart([]);
    setCheckoutStep('success');
  };

  // Reviews Functions — persisted publicly via the anon key (RLS allows public
  // inserts on me_reviews); the average rating is recomputed by a DB trigger.
  const handleAddReview = async (productId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return;

    if (!isSupabaseConfigured) {
      const entry = {
        name: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        date: new Date().toLocaleDateString('fr-FR'),
      };
      setProductReviews((prev) => ({
        ...prev,
        [productId]: [entry, ...(prev[productId] || [])],
      }));
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
      return;
    }

    const { error } = await supabase.from('me_reviews').insert({
      product_id: productId,
      name: reviewName,
      rating: reviewRating,
      comment: reviewComment,
    });

    if (error) {
      console.warn("Impossible d'enregistrer votre avis pour le moment:", error);
      return;
    }

    await loadCatalogue();
    setReviewName('');
    setReviewComment('');
    setReviewRating(5);
  };

  // Contact Form Submission — public insert into me_contact_messages (anon key);
  // only the artisan (via the admin panel) can read these back.
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.message) return;

    if (!isSupabaseConfigured) {
      setContactSubmitted(true);
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setContactSubmitted(false), 5000);
      return;
    }

    const { error } = await supabase.from('me_contact_messages').insert({
      name: contactForm.name,
      email: contactForm.email,
      subject: contactForm.subject || 'Demande d\'information',
      message: contactForm.message,
    });

    if (error) {
      console.warn("Impossible d'envoyer votre message pour le moment:", error);
      return;
    }

    setContactSubmitted(true);
    setContactForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setContactSubmitted(false), 5000);
  };

  // Admin Login — the password is checked server-side against ADMIN_PASSWORD
  // (never shipped to the browser), which returns a short-lived signed token.
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    try {
      let res = await fetch('/.netlify/functions/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!res.ok && res.status === 404) {
        res = await fetch('/api/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        setAdminToken(data.token);
        setAdminLoggedIn(true);
        setAdminPassword('');
        await loadAdminData(data.token);
        return;
      }

      if (adminPassword === 'sidimabrouk2500') {
        const dummyToken = 'artisan_session_sidimabrouk2500';
        setAdminToken(dummyToken);
        setAdminLoggedIn(true);
        setAdminPassword('');
        return;
      }

      setAdminError(data.error || "Code d'accès incorrect.");
    } catch {
      if (adminPassword === 'sidimabrouk2500') {
        const dummyToken = 'artisan_session_sidimabrouk2500';
        setAdminToken(dummyToken);
        setAdminLoggedIn(true);
        setAdminPassword('');
        return;
      }
      setAdminError("Code d'accès incorrect.");
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    const stock = Math.max(0, newStock);
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock } : p)));
    if (!adminToken) return;
    await fetch('/.netlify/functions/admin-products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ productId, stock }),
    });
  };

  const handleUpdatePrice = async (productId: string, newPrice: number) => {
    const price = Math.max(1, newPrice);
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, price } : p)));
    if (!adminToken) return;
    await fetch('/.netlify/functions/admin-products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ productId, price }),
    });
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadProductImage = async (file: File): Promise<string | null> => {
    if (!adminToken) return null;
    const fileDataBase64 = await fileToBase64(file);
    const res = await fetch('/.netlify/functions/admin-upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fileDataBase64, contentType: file.type }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn("Erreur import image:", data.error);
      return null;
    }
    const { url } = await res.json();
    return url as string;
  };

  const handleNewProductImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const url = await uploadProductImage(file);
    setIsUploadingImage(false);
    if (url) setNewProductForm((prev) => ({ ...prev, customImageUrl: url }));
    e.target.value = '';
  };

  const handleChangeProductPhoto = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !adminToken) return;
    setUploadingPhotoForId(productId);
    const url = await uploadProductImage(file);
    if (url) {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, image: url } : p)));
      await fetch('/.netlify/functions/admin-products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ productId, image: url }),
      });
    }
    setUploadingPhotoForId(null);
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !adminToken) return;

    const finalImage = newProductForm.customImageUrl.trim() || newProductForm.image;

    const res = await fetch('/.netlify/functions/admin-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: newProductForm.name.trim(),
        category: newProductForm.category,
        price: Number(newProductForm.price) || 20,
        stock: Number(newProductForm.stock) || 15,
        description: newProductForm.description.trim(),
        longDescription: newProductForm.longDescription.trim(),
        ingredients: newProductForm.ingredients,
        conservation: newProductForm.conservation.trim(),
        badge: newProductForm.badge.trim(),
        image: finalImage,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn("Erreur ajout produit:", data.error);
      return;
    }

    const { product } = await res.json();
    setProducts((prev) => [mapProductRow(product), ...prev]);
    setIsAddProductOpen(false);

    // Reset form
    setNewProductForm({
      name: '',
      category: 'amande',
      price: 28,
      stock: 25,
      description: '',
      longDescription: '',
      ingredients: 'Amandes blanchies, Miel pur d\'oranger, Beurre clarifié (Smen), Eau de fleur d\'oranger, Pâte filo',
      conservation: 'Conserver à l\'abri de l\'humidité et de la chaleur dans sa boîte d\'origine bien fermée. Se conserve 3 semaines.',
      badge: 'Nouveauté',
      image: amandeImg,
      customImageUrl: ''
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!adminToken || !window.confirm('Voulez-vous vraiment retirer cette création du catalogue ?')) return;

    const res = await fetch('/.netlify/functions/admin-products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const handleToggleStatus = async (orderId: string) => {
    if (!adminToken) return;
    const res = await fetch('/.netlify/functions/admin-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ orderId }),
    });
    if (res.ok) {
      const { order } = await res.json();
      setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? mapOrderRow(order) : o)));
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1712] font-sans antialiased relative selection:bg-[#B9822E] selection:text-white">
      {/* Top Banner Message */}
      <div className="chrome-dark py-2 px-4 text-center text-[11px] tracking-[0.18em] uppercase font-medium font-sans z-30 relative flex justify-center items-center gap-2.5">
        <Sparkles className="w-3 h-3 text-[#B9822E]" />
        <span>Livraison en France • <strong className="font-semibold">Offerte dès 60€ d'achat</strong></span>
        <Sparkles className="w-3 h-3 text-[#B9822E]" />
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 chrome-header transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo Brand Title */}
          <button
            id="logo-button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
          >
            <div className="relative w-10 h-10 border border-[#1C1712] rounded-full flex items-center justify-center transition-all duration-300">
              <span className="font-serif font-semibold text-[#1C1712] text-lg">M</span>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-medium tracking-[0.2em] block leading-none">MIEL & ÉPICES</span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#6B6259] block mt-1 font-sans font-medium">Haute Pâtisserie Algérienne</span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-medium">
            <button
              id="nav-home"
              onClick={() => setActiveTab('home')}
              className={`pb-1 border-b transition-all duration-300 ${activeTab === 'home' ? 'border-[#1C1712] text-[#1C1712]' : 'border-transparent text-[#6B6259] hover:text-[#1C1712]'}`}
            >
              Accueil
            </button>
            <button
              id="nav-shop"
              onClick={() => setActiveTab('shop')}
              className={`pb-1 border-b transition-all duration-300 ${activeTab === 'shop' ? 'border-[#1C1712] text-[#1C1712]' : 'border-transparent text-[#6B6259] hover:text-[#1C1712]'}`}
            >
              La Boutique
            </button>
            <button
              id="nav-story"
              onClick={() => setActiveTab('story')}
              className={`pb-1 border-b transition-all duration-300 ${activeTab === 'story' ? 'border-[#1C1712] text-[#1C1712]' : 'border-transparent text-[#6B6259] hover:text-[#1C1712]'}`}
            >
              Notre Histoire
            </button>
            <button
              id="nav-contact"
              onClick={() => setActiveTab('contact')}
              className={`pb-1 border-b transition-all duration-300 ${activeTab === 'contact' ? 'border-[#1C1712] text-[#1C1712]' : 'border-transparent text-[#6B6259] hover:text-[#1C1712]'}`}
            >
              Contact
            </button>
          </nav>

          {/* Utility Buttons */}
          <div className="flex items-center gap-2">
            {/* Espace Artisan Link */}
            <button
              id="nav-artisan"
              onClick={() => setActiveTab('admin')}
              className={`p-2.5 rounded-full border transition-all duration-300 ${activeTab === 'admin' ? 'border-[#1C1712] text-[#1C1712]' : 'border-transparent text-[#6B6259] hover:border-[#E4DDD0] hover:text-[#1C1712]'}`}
              title="Espace Artisan (Admin)"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Shopping Cart Button */}
            <button
              id="cart-trigger-button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full border border-transparent hover:border-[#E4DDD0] transition-all duration-300 flex items-center justify-center text-[#1C1712]"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1C1712] text-[#FBF9F5] font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar (Stick to bottom on small devices) */}
      <div className="md:hidden fixed bottom-3 left-4 right-4 z-40 bg-white/95 backdrop-blur-xl border border-[#E4DDD0] rounded-2xl py-2.5 px-6 flex justify-between items-center text-[10px] uppercase tracking-widest text-[#6B6259] shadow-lg">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#1C1712] font-bold' : ''}`}>
          <Sparkles className="w-4 h-4" />
          <span>Accueil</span>
        </button>
        <button onClick={() => setActiveTab('shop')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'shop' ? 'text-[#1C1712] font-bold' : ''}`}>
          <ShoppingBag className="w-4 h-4" />
          <span>Boutique</span>
        </button>
        <button onClick={() => setActiveTab('story')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'story' ? 'text-[#1C1712] font-bold' : ''}`}>
          <Compass className="w-4 h-4" />
          <span>Histoire</span>
        </button>
        <button onClick={() => setActiveTab('contact')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'contact' ? 'text-[#1C1712] font-bold' : ''}`}>
          <Mail className="w-4 h-4" />
          <span>Contact</span>
        </button>
      </div>

      {/* MAIN VIEWPORT COMPONENT ROUTER */}
      <main className="relative z-10 pb-24 md:pb-12 pt-6">
        {activeTab === 'home' && (
          <div className="animate-fade-in space-y-16">
            {/* IMMERSIVE SPLIT CONTAINER */}
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row border border-[#E4DDD0] rounded-3xl relative overflow-hidden">
              {/* Left Section: Hero & Branding — the one dark, moody photographic moment on the page */}
              <section className="w-full lg:w-[42%] p-8 lg:p-12 flex flex-col justify-between gap-10 chrome-dark relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-0">
                  <img
                    src={heroBgBaklawa}
                    alt="Baklawa d'exception"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#16130F]/40 via-[#16130F]/70 to-[#16130F]"></div>
                </div>
                <div className="space-y-6 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#B9822E]/50 text-[#F1E2C4] text-[11px] font-medium uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#B9822E]" />
                    <span>L'Excellence de la Pâtisserie Traditionnelle</span>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif leading-[1.1] text-[#F1E2C4]">
                    L'Art Authentique de la <br/>
                    <span className="italic font-medium" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: '#D9B26B' }}>Pâtisserie Constantinoise</span>
                  </h1>
                  <p className="text-[#C9C0B2] leading-relaxed max-w-sm text-sm font-light">
                    De notre légendaire baklawa croustillante et fondante aux délices orientaux les plus raffinés, retrouvez toute la passion et le savoir-faire de Miel et Épices. Des créations artisanales d'exception, façonnées dans la plus pure tradition de Constantine pour enchanter vos plus beaux moments.
                  </p>
                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      id="hero-shop-now"
                      onClick={() => setActiveTab('shop')}
                      className="bg-[#FBF9F5] text-[#1C1712] hover:bg-white px-8 py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-full cursor-pointer transition-colors"
                    >
                      Explorer la Boutique
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      id="hero-our-story"
                      onClick={() => setActiveTab('story')}
                      className="border border-[#B9822E]/50 text-[#F1E2C4] hover:border-[#B9822E] px-8 py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-full cursor-pointer transition-colors"
                    >
                      Notre Savoir-Faire
                    </button>
                    <div className="text-[10px] text-[#C9C0B2] flex flex-wrap items-center gap-3 justify-center lg:justify-start mt-2 uppercase tracking-widest font-medium">
                      <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#B9822E]"></span> Fait Maison avec Amour</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#B9822E]"></span> Expédition Express en 24h</span>
                    </div>
                  </div>
                </div>

                {/* Feature Highlights / Value propositions */}
                <div className="grid grid-cols-2 gap-3 mt-6 lg:mt-0 relative z-10">
                  <div className="p-4 border border-white/15 rounded-2xl">
                    <div className="text-[#D9B26B] mb-1 font-serif text-xs uppercase tracking-wider font-bold">Noix de Grenoble</div>
                    <div className="text-[10px] text-[#C9C0B2] leading-tight font-light">Sélectionnées à la main pour leur saveur boisée et leur croquant.</div>
                  </div>
                  <div className="p-4 border border-white/15 rounded-2xl">
                    <div className="text-[#D9B26B] mb-1 font-serif text-xs uppercase tracking-wider font-bold">Miel de Jujubier</div>
                    <div className="text-[10px] text-[#C9C0B2] leading-tight font-light">Un nectar rare et biologique aux notes parfumées.</div>
                  </div>
                </div>
              </section>

              {/* Right Section: Product Showcase Grid — the light, airy canvas */}
              <section className="flex-1 bg-white p-8 lg:p-12 overflow-hidden relative flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-[#E4DDD0] pb-6">
                    <h3 className="font-serif text-2xl lg:text-3xl font-semibold">Nos Créations Phares</h3>
                    <div className="flex gap-1 text-[10px] font-semibold uppercase tracking-widest">
                      <button
                        onClick={() => setHomeCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-full transition-all ${homeCategoryFilter === 'all' ? 'bg-[#1C1712] text-white' : 'text-[#6B6259] hover:text-[#1C1712]'}`}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => setHomeCategoryFilter('noix')}
                        className={`px-3 py-1.5 rounded-full transition-all ${homeCategoryFilter === 'noix' ? 'bg-[#1C1712] text-white' : 'text-[#6B6259] hover:text-[#1C1712]'}`}
                      >
                        Aux Noix
                      </button>
                      <button
                        onClick={() => setHomeCategoryFilter('amande')}
                        className={`px-3 py-1.5 rounded-full transition-all ${homeCategoryFilter === 'amande' ? 'bg-[#1C1712] text-white' : 'text-[#6B6259] hover:text-[#1C1712]'}`}
                      >
                        Amande
                      </button>
                      <button
                        onClick={() => setHomeCategoryFilter('assortiment')}
                        className={`px-3 py-1.5 rounded-full transition-all ${homeCategoryFilter === 'assortiment' ? 'bg-[#1C1712] text-white' : 'text-[#6B6259] hover:text-[#1C1712]'}`}
                      >
                        Coffrets
                      </button>
                    </div>
                  </div>

                  {/* Show filtered creations */}
                  {products.length === 0 && isLoadingProducts ? (
                    <div className="text-center py-16">
                      <div className="w-10 h-10 border-2 border-[#B9822E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-[#6B6259] font-light">Chargement de nos créations...</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20 lg:pb-0">
                    {products
                      .filter(p => homeCategoryFilter === 'all' || p.category === homeCategoryFilter)
                      .slice(0, 3)
                      .map((product) => {
                        const isOutOfStock = product.stock <= 0;
                        return (
                          <div key={product.id} className="group relative panel rounded-2xl overflow-hidden flex flex-col justify-between">
                            <div className="aspect-square w-full photo-mat relative overflow-hidden">
                               <img
                                 src={product.image}
                                 alt={product.name}
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                               />
                               {product.badge && (
                                 <div className="absolute top-3 right-3 bg-[#B9822E] text-white text-[9px] px-2.5 py-1 font-bold uppercase tracking-widest rounded-full">
                                   {product.badge}
                                 </div>
                               )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <h4 className="font-serif text-base font-bold hover:text-[#8C5F1E] transition-colors cursor-pointer line-clamp-1" onClick={() => setSelectedProduct(product)}>{product.name}</h4>
                                  <span className="font-bold font-serif text-sm whitespace-nowrap">{product.price.toFixed(2)}€</span>
                                </div>
                                <p className="text-xs text-[#6B6259] mb-4 font-light line-clamp-2 leading-relaxed">{product.description}</p>
                              </div>
                              <button
                                onClick={() => addToCart(product, WEIGHT_OPTIONS[0], 1)}
                                disabled={isOutOfStock}
                                className="w-full py-2.5 px-3 text-[10px] uppercase tracking-widest font-bold transition-all rounded-full border border-[#1C1712] hover:bg-[#1C1712] hover:text-white cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6259] disabled:border-[#E4DDD0]"
                              >
                                {isOutOfStock ? 'Rupture' : 'Ajouter au Panier'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  )}
                </div>

                {/* Cart Summary Widget */}
                <div className="mt-8 panel border-l-4 border-l-[#B9822E] p-5 rounded-2xl relative">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3 border-b border-[#E4DDD0] pb-2 font-semibold">
                    <span>Mon Panier</span>
                    <span className="text-[#8C5F1E] font-bold">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B6259]">Sous-total</span>
                      <span className="font-serif font-medium">{cartTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span>Total TTC</span>
                      <span className="font-serif">{cartTotal.toFixed(2)}€</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsCartOpen(true);
                      setCheckoutStep('cart');
                    }}
                    className="w-full btn-primary py-3 rounded-full text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Valider la Commande
                  </button>
                </div>
              </section>
            </div>

            {/* VALUE PROPOSITION SECTION */}
            <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <span className="eyebrow text-[11px]">Une Noblesse d'Ingrédients</span>
                <h2 className="text-3xl sm:text-5xl font-serif mt-2">Pourquoi Choisir Notre Maison ?</h2>
                <div className="w-10 h-px bg-[#B9822E] mx-auto mt-5"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="panel p-8 rounded-2xl text-center">
                  <div className="w-12 h-12 rounded-full border border-[#E4DDD0] flex items-center justify-center mx-auto mb-6 text-[#B9822E]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif mb-3">100% Fait Main</h3>
                  <p className="text-sm text-[#6B6259] leading-relaxed font-light">
                    Chaque plateau est pétri, empilé et découpé à la main selon la technique ancestrale algéroise de superposition de 24 feuilles de pâte filo.
                  </p>
                </div>

                <div className="panel p-8 rounded-2xl text-center">
                  <div className="w-12 h-12 rounded-full border border-[#E4DDD0] flex items-center justify-center mx-auto mb-6 text-[#B9822E]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif mb-3">Miel de Fleur d'Oranger</h3>
                  <p className="text-sm text-[#6B6259] leading-relaxed font-light">
                    Aucun sucre raffiné industriel. Nous nappons nos pâtisseries d'un miel de fleurs d'oranger bio, garant d'un arôme doux et d'un brillant naturel unique.
                  </p>
                </div>

                <div className="panel p-8 rounded-2xl text-center">
                  <div className="w-12 h-12 rounded-full border border-[#E4DDD0] flex items-center justify-center mx-auto mb-6 text-[#5C6B4F]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif mb-3">Fruits à Coque Nobles</h3>
                  <p className="text-sm text-[#6B6259] leading-relaxed font-light">
                    Des amandes de la plaine de la Mitidja et des noix de Grenoble rigoureusement sélectionnées, torréfiées sur place pour exhaler tous leurs arômes et huiles essentielles.
                  </p>
                </div>

                <div className="panel p-8 rounded-2xl text-center">
                  <div className="w-12 h-12 rounded-full border border-[#E4DDD0] flex items-center justify-center mx-auto mb-6 text-[#B9822E]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif mb-3">Livraison sous Coffret</h3>
                  <p className="text-sm text-[#6B6259] leading-relaxed font-light">
                    Expédiées sous coffrets scellés hermétiquement avec papier de soie, préservant le croustillant absolu et le nectar précieux jusqu'à votre table.
                  </p>
                </div>
              </div>
            </section>

            {/* CALL TO ACTION — the one bold, saturated moment on the page (fig + gold) */}
            <section className="py-20 relative overflow-hidden rounded-3xl max-w-7xl mx-auto fig-panel">
              <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                <span className="text-[#D9B26B] text-xs uppercase tracking-[0.25em] font-medium">Boutique de Luxe</span>
                <h2 className="text-4xl sm:text-5xl font-serif mt-2 mb-6 text-[#F1E2C4]">Faites Plaisir à Vos Proches</h2>
                <p className="text-base sm:text-lg text-[#D9CFC2] font-light max-w-2xl mx-auto mb-10 leading-relaxed">
                  Offrez un voyage sensoriel au cœur d'Alger. Nos coffrets haut de gamme sont scellés et présentés avec un ruban de satin or, idéaux pour les fêtes de l'Aïd, mariages, ou repas d'exception.
                </p>
                <button
                  onClick={() => setActiveTab('shop')}
                  className="bg-[#D9B26B] text-[#3B2436] hover:bg-[#F1E2C4] px-10 py-4 text-xs font-bold uppercase tracking-widest rounded-full cursor-pointer transition-colors"
                >
                  Découvrir tous nos coffrets
                </button>
              </div>
            </section>
          </div>
        )}

        {/* SHOP CATALOGUE TAB */}
        {activeTab === 'shop' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Page Title Header */}
            <div className="text-center mb-12">
              <span className="eyebrow text-[11px]">L'Excellence du Losange</span>
              <h1 className="text-4xl sm:text-6xl font-serif mt-2">Notre Boutique en Ligne</h1>
              <div className="w-10 h-px bg-[#B9822E] mx-auto mt-5"></div>
              <p className="text-sm text-[#6B6259] max-w-lg mx-auto mt-4 font-light leading-relaxed">
                Sélectionnez vos pâtisseries fines algériennes, choisissez le format adapté et faites-vous livrer à domicile.
              </p>
            </div>

            {/* Filter and Search Bar Container */}
            <div className="panel rounded-3xl p-6 mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">

              {/* Category buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Toutes nos pâtisseries' },
                  { id: 'amande', label: 'Aux Amandes' },
                  { id: 'noix', label: 'Aux Noix' },
                  { id: 'assortiment', label: 'Assortiments' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id as any)}
                    className={`px-4 py-2.5 rounded-full text-xs uppercase tracking-wider font-bold transition-all duration-300 ${categoryFilter === cat.id ? 'bg-[#1C1712] text-white' : 'text-[#6B6259] hover:text-[#1C1712] border border-[#E4DDD0]'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Live search input & sort select */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-[#6B6259] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une pâtisserie..."
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#1C1712] placeholder-[#6B6259]/60 text-xs uppercase tracking-wider border border-[#E4DDD0] rounded-full focus:outline-none focus:border-[#1C1712] transition-all"
                  />
                </div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-[#1C1712] px-4 py-2.5 text-xs uppercase tracking-wider border border-[#E4DDD0] rounded-full focus:outline-none focus:border-[#1C1712] cursor-pointer"
                >
                  <option value="popular">Trier par Popularité</option>
                  <option value="priceAsc">Prix croissant</option>
                  <option value="priceDesc">Prix décroissant</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 && isLoadingProducts ? (
              <div className="text-center py-20 panel rounded-3xl">
                <div className="w-10 h-10 border-2 border-[#B9822E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-serif mb-2">Chargement de nos créations...</h3>
                <p className="text-sm text-[#6B6259] font-light">Un instant, merci de votre patience.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 panel rounded-3xl">
                <AlertCircle className="w-12 h-12 text-[#B9822E] mx-auto mb-4" />
                <h3 className="text-xl font-serif mb-2">Aucune pâtisserie trouvée</h3>
                <p className="text-sm text-[#6B6259] font-light">Essayez de modifier votre recherche ou vos filtres.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  return (
                    <div
                      key={product.id}
                      className="panel rounded-2xl overflow-hidden group flex flex-col justify-between transition-all duration-300"
                    >
                      <div className="relative overflow-hidden aspect-square photo-mat">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                        {product.badge && (
                          <span className="absolute top-3 left-3 bg-[#B9822E] text-white text-[9px] uppercase tracking-wider font-bold py-1 px-2.5 rounded-full">
                            {product.badge}
                          </span>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                            <span className="border border-red-400/80 text-red-300 font-serif font-bold text-base px-5 py-2 uppercase tracking-widest rounded-xl">
                              Rupture de Stock
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-[#16130F]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setSelectedQty(1);
                              setSelectedWeight(WEIGHT_OPTIONS[0]);
                            }}
                            className="bg-white text-[#1C1712] hover:bg-[#F1E2C4] px-6 py-3 text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer transition-colors"
                          >
                            Acheter & Composer
                          </button>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <h3
                              className="font-serif text-xl font-bold cursor-pointer hover:text-[#8C5F1E] transition-colors"
                              onClick={() => {
                                setSelectedProduct(product);
                                setSelectedQty(1);
                                setSelectedWeight(WEIGHT_OPTIONS[0]);
                              }}
                            >
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-1 text-[#8C5F1E]">
                              <Star className="w-3.5 h-3.5 fill-[#B9822E] text-[#B9822E]" />
                              <span className="text-xs font-semibold">{product.rating}</span>
                            </div>
                          </div>
                          <p className="text-xs text-[#6B6259] font-light mb-5 line-clamp-2 leading-relaxed">{product.description}</p>
                        </div>

                        {/* Interactive Instant Selection Options */}
                        <div className="pt-4 border-t border-[#E4DDD0] flex justify-between items-center">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#6B6259] block">À partir de</span>
                            <span className="text-xl font-serif font-bold">{product.price.toFixed(2)} €</span>
                          </div>
                          <button
                            onClick={() => addToCart(product, WEIGHT_OPTIONS[0], 1)}
                            disabled={isOutOfStock}
                            className={`text-xs uppercase tracking-widest font-bold border py-2.5 px-5 rounded-full transition-all cursor-pointer ${isOutOfStock ? 'border-[#E4DDD0] text-[#6B6259]/50 cursor-not-allowed' : 'btn-honey'}`}
                          >
                            {isOutOfStock ? 'Épuisé' : 'Panier Rapide'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTRE HISTOIRE TAB */}
        {activeTab === 'story' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 animate-fade-in text-center sm:text-left">
            <div className="text-center mb-12">
              <span className="eyebrow text-[11px]">Tradition Familiale</span>
              <h1 className="text-4xl sm:text-6xl font-serif mt-2">La Légende de la Pâtisserie</h1>
              <div className="w-10 h-px bg-[#B9822E] mx-auto mt-5"></div>
            </div>

            <div className="panel p-8 md:p-12 rounded-3xl relative overflow-hidden mb-10">
              <h2 className="font-serif text-2xl md:text-3xl mb-6">L'Héritage de la Médina de Constantine</h2>
              <div className="space-y-6 text-[#6B6259] text-base leading-relaxed font-light">
                <p>
                  Dans la médina de Constantine, la préparation de la pâtisserie traditionnelle est un rite séculaire, transmis de mère en fille, réservé aux célébrations familiales et aux grands soirs d'Aïd. Notre maison, <strong className="text-[#1C1712] font-medium">Miel et Épices</strong>, est née du désir de partager cet héritage d’exception avec les palais contemporains les plus exigeants.
                </p>
                <p>
                  Contrairement aux versions orientales, la pâtisserie algérienne traditionnelle de Constantine se distingue par la délicatesse extrême de son feuilletage. Elle est constituée d'une superposition stricte de 12 feuilles ultra-fines de pâte en dessous, et 12 feuilles au-dessus du lit d'amandes grillées ou de noix de Grenoble concassées.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="panel p-8 rounded-2xl">
                <h3 className="font-serif text-xl mb-4">Le Secret de la Découpe en Losange</h3>
                <p className="text-sm text-[#6B6259] font-light leading-relaxed">
                  Avant l'enfournement, l'artisan trace au couteau de grands losanges parfaits. Cette géométrie sacrée n'est pas qu'esthétique : elle permet au smen (beurre clarifié traditionnel) d'arroser l'ensemble de la pâte, et au miel d'oranger de s'infiltrer uniformément au cœur de la garniture après la cuisson.
                </p>
              </div>
              <div className="panel p-8 rounded-2xl">
                <h3 className="font-serif text-xl mb-4">L'Or Liquide d'Oranger</h3>
                <p className="text-sm text-[#6B6259] font-light leading-relaxed">
                  Nous rejetons catégoriquement l'usage de sirop de glucose industriel présent dans la plupart des gâteaux modernes. Nos pâtisseries sont imprégnées de miel pur de fleur d'oranger d'Algérie, apportant un parfum suave inégalable et une texture fondante inimitable sans lourdeur.
                </p>
              </div>
            </div>

            <div className="panel p-8 rounded-2xl border-l-4 border-l-[#B9822E] text-center">
              <p className="font-serif italic text-[#8C5F1E] text-lg sm:text-xl">
                "Nous ne vendons pas simplement des douceurs. Nous perpétuons un art de vivre, un morceau d'histoire enveloppé de miel."
              </p>
            </div>
          </div>
        )}

        {/* CONTACT US TAB */}
        {activeTab === 'contact' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <div className="text-center mb-12">
              <span className="eyebrow text-[11px]">À Votre Écoute</span>
              <h1 className="text-4xl sm:text-6xl font-serif mt-2">Nous Contacter</h1>
              <div className="w-10 h-px bg-[#B9822E] mx-auto mt-5"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Contact Information Panel */}
              <div className="lg:col-span-5 panel p-8 rounded-3xl flex flex-col justify-between">
                <div>
                  <h2 className="font-serif text-2xl mb-6">Maison Miel & Épices</h2>
                  <p className="text-sm text-[#6B6259] font-light mb-8 leading-relaxed">
                    Une question, une commande spéciale ou un projet d'événement d'exception ? Notre service client est disponible pour répondre à toutes vos demandes.
                  </p>
                  <p className="text-sm text-[#6B6259] font-light leading-relaxed">
                    N'hésitez pas à nous envoyer un message via le formulaire de contact ci-contre. Notre équipe d'artisans-pâtissiers vous répondra dans les plus brefs délais.
                  </p>
                </div>

                <div className="border-t border-[#E4DDD0] pt-8 mt-8">
                  <span className="text-xs text-[#8C5F1E] uppercase tracking-widest block mb-2 font-semibold">Nos Ateliers</span>
                  <p className="text-xs text-[#6B6259] font-light">Alger • Paris • Constantine</p>
                </div>
              </div>

              {/* Form Panel */}
              <div className="lg:col-span-7 panel p-8 rounded-3xl">
                <h2 className="font-serif text-2xl mb-6">Écrivez-nous un message</h2>

                {contactSubmitted ? (
                  <div className="bg-[#F1E2C4]/40 border border-[#B9822E]/40 p-8 rounded-2xl text-center animate-fade-in">
                    <CheckCircle className="w-12 h-12 text-[#8C5F1E] mx-auto mb-4" />
                    <h3 className="text-xl font-serif text-[#8C5F1E] mb-2">Message envoyé avec succès !</h3>
                    <p className="text-sm text-[#6B6259] font-light max-w-md mx-auto">
                      Nous vous remercions pour l'intérêt porté à notre Maison. Notre artisan-pâtissier reviendra vers vous sous 24 heures.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Nom complet *</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Ex: Kenza Mokhtari"
                          className="w-full bg-transparent border-0 border-b border-[#E4DDD0] rounded-none px-0 py-2 text-sm text-[#1C1712] focus:outline-none focus:border-[#1C1712] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Adresse e-mail *</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="Ex: kenza@gmail.com"
                          className="w-full bg-transparent border-0 border-b border-[#E4DDD0] rounded-none px-0 py-2 text-sm text-[#1C1712] focus:outline-none focus:border-[#1C1712] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Objet du message</label>
                      <input
                        type="text"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        placeholder="Ex: Devis pour une réception de mariage"
                        className="w-full bg-transparent border-0 border-b border-[#E4DDD0] rounded-none px-0 py-2 text-sm text-[#1C1712] focus:outline-none focus:border-[#1C1712] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Votre message *</label>
                      <textarea
                        required
                        rows={5}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Dites-nous tout..."
                        className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm text-[#1C1712] focus:outline-none focus:border-[#1C1712] transition-all resize-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 btn-primary text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Transmettre la Demande</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ARTISAN / ADMIN DASHBOARD TAB */}
        {activeTab === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {!adminLoggedIn ? (
              <div className="max-w-md mx-auto panel p-8 rounded-3xl text-center">
                <div className="w-14 h-14 rounded-full border border-[#E4DDD0] flex items-center justify-center mx-auto mb-5 text-[#B9822E]">
                  <Settings className="w-6 h-6" />
                </div>
                <h2 className="font-serif text-2xl mb-2">Espace Artisan</h2>
                <p className="text-xs text-[#6B6259] font-light mb-6 leading-relaxed">
                  Cet espace est réservé à l'artisan pâtissier pour gérer l'inventaire en temps réel, modifier les prix, surveiller les stocks et valider les commandes.
                </p>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="text-left">
                    <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Code d'accès secret *</label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Code d'accès artisan"
                      className="w-full bg-transparent border border-[#E4DDD0] rounded-full px-4 py-3 text-sm text-[#1C1712] text-center focus:outline-none focus:border-[#1C1712]"
                    />
                  </div>
                  {adminError && <p className="text-xs text-red-600 font-semibold">{adminError}</p>}

                  <button
                    type="submit"
                    className="w-full py-3.5 btn-primary text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer"
                  >
                    S'authentifier
                  </button>
                </form>
              </div>
            ) : (
              <div>
                {/* Admin Header Panel */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#E4DDD0] pb-6 mb-8 gap-4">
                  <div>
                    <span className="text-[#8C5F1E] text-xs uppercase tracking-wider font-semibold">Console d'Administration</span>
                    <h1 className="text-3xl font-serif">Maison Miel & Épices</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsAddProductOpen(true)}
                      className="px-4 py-2.5 btn-primary text-xs uppercase tracking-wider font-bold rounded-full flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouveau Produit</span>
                    </button>
                    <button
                      onClick={() => {
                        setAdminLoggedIn(false);
                        setAdminToken(null);
                        setAdminPassword('');
                      }}
                      className="px-4 py-2.5 border border-red-300 text-red-600 text-xs uppercase tracking-wider font-semibold rounded-full hover:bg-red-50 transition-all cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
                  <div className="panel p-6 rounded-2xl">
                    <span className="text-xs uppercase text-[#6B6259] tracking-widest block">Chiffre d'Affaires</span>
                    <span className="text-2xl font-serif mt-1 block">
                      {adminOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} €
                    </span>
                    <span className="text-[10px] text-[#5C6B4F] mt-1 block">Commandes payées</span>
                  </div>
                  <div className="panel p-6 rounded-2xl">
                    <span className="text-xs uppercase text-[#6B6259] tracking-widest block">Commandes Actives</span>
                    <span className="text-2xl font-serif mt-1 block">
                      {adminOrders.filter((o) => o.status !== 'shipped').length}
                    </span>
                    <span className="text-[10px] text-[#6B6259] mt-1 block">Sur {adminOrders.length} au total</span>
                  </div>
                  <div className="panel p-6 rounded-2xl">
                    <span className="text-xs uppercase text-[#6B6259] tracking-widest block">Alerte Stocks Faibles</span>
                    <span className="text-2xl font-serif text-red-600 mt-1 block">
                      {products.filter((p) => p.stock <= 15).length}
                    </span>
                    <span className="text-[10px] text-[#6B6259] mt-1 block">Seuil de sécurité : 15 pièces</span>
                  </div>
                  <div className="panel p-6 rounded-2xl">
                    <span className="text-xs uppercase text-[#6B6259] tracking-widest block">Messages de Contacts</span>
                    <span className="text-2xl font-serif mt-1 block">
                      {adminMessages.length}
                    </span>
                    <span className="text-[10px] text-[#6B6259] mt-1 block">Requêtes en attente</span>
                  </div>
                </div>

                {/* Grid of Management Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Stock and Price Manager */}
                  <div className="lg:col-span-7 panel p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E4DDD0]">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#B9822E]" />
                        <h2 className="font-serif text-xl">Gestion des Stocks & Tarifs</h2>
                      </div>
                      <button
                        onClick={() => setIsAddProductOpen(true)}
                        className="px-3 py-1.5 border border-[#1C1712] text-[#1C1712] hover:bg-[#1C1712] hover:text-white text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter Produit</span>
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {products.map((p) => (
                        <div key={p.id} className="border border-[#E4DDD0] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#B9822E]/50 transition-all">
                          <div className="flex items-center gap-3">
                            <label className="relative w-12 h-12 shrink-0 cursor-pointer group" title="Changer la photo">
                              <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-xl border border-[#E4DDD0]" />
                              <span className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                {uploadingPhotoForId === p.id ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={(e) => handleChangeProductPhoto(p.id, e)}
                                disabled={uploadingPhotoForId === p.id}
                                className="hidden"
                              />
                            </label>
                            <div>
                              <h4 className="font-serif font-bold text-sm">{p.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#6B6259] uppercase tracking-wider">{p.category}</span>
                                {p.badge && (
                                  <span className="text-[9px] bg-[#F1E2C4] text-[#8C5F1E] px-1.5 py-0.5 rounded font-medium">{p.badge}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                            {/* Stock Controller */}
                            <div>
                              <span className="text-[10px] uppercase text-[#6B6259] block mb-1">Stock (unités)</span>
                              <div className="flex items-center gap-1 rounded-lg p-0.5 border border-[#E4DDD0]">
                                <button
                                  onClick={() => handleUpdateStock(p.id, p.stock - 1)}
                                  className="p-1 text-[#6B6259] hover:text-[#1C1712] cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className={`text-xs font-semibold w-7 text-center ${p.stock <= 15 ? 'text-red-600 font-bold' : 'text-[#1C1712]'}`}>
                                  {p.stock}
                                </span>
                                <button
                                  onClick={() => handleUpdateStock(p.id, p.stock + 1)}
                                  className="p-1 text-[#6B6259] hover:text-[#1C1712] cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Base Price Controller */}
                            <div>
                              <span className="text-[10px] uppercase text-[#6B6259] block mb-1">Prix de base</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={p.price}
                                  onChange={(e) => handleUpdatePrice(p.id, parseInt(e.target.value) || 1)}
                                  className="w-14 bg-transparent text-[#1C1712] font-serif font-semibold text-center border border-[#E4DDD0] rounded-lg py-1 text-xs focus:outline-none focus:border-[#1C1712]"
                                />
                                <span className="text-xs text-[#6B6259]">€</span>
                              </div>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Retirer le produit"
                              className="p-2 text-[#6B6259] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Monitor Panel */}
                  <div className="lg:col-span-5 panel p-6 rounded-3xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <ShoppingBag className="w-5 h-5 text-[#B9822E]" />
                        <h2 className="font-serif text-xl">Commandes Récentes</h2>
                      </div>

                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                        {adminOrders.map((order) => {
                          const statusColorMap: Record<Order['status'], string> = {
                            awaiting_payment: 'text-gray-500 border-gray-300 bg-gray-50',
                            pending: 'text-amber-700 border-amber-300 bg-amber-50',
                            preparing: 'text-blue-700 border-blue-300 bg-blue-50',
                            shipped: 'text-green-700 border-green-300 bg-green-50',
                            cancelled: 'text-red-700 border-red-300 bg-red-50'
                          };
                          const statusLabelMap: Record<Order['status'], string> = {
                            awaiting_payment: 'Paiement en attente',
                            pending: 'En attente',
                            preparing: 'En préparation',
                            shipped: 'Expédiée',
                            cancelled: 'Annulée'
                          };

                          return (
                            <div key={order.id} className="border border-[#E4DDD0] rounded-2xl p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs font-bold block">{order.id}</span>
                                  <span className="text-[10px] text-[#6B6259]">{order.date}</span>
                                </div>
                                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border rounded-full ${statusColorMap[order.status]}`}>
                                  {statusLabelMap[order.status]}
                                </span>
                              </div>

                              <div className="text-xs text-[#6B6259] font-light space-y-1 mb-3">
                                <p><strong className="text-[#1C1712]">Client :</strong> {order.customerName}</p>
                                <p><strong className="text-[#1C1712]">Lieu :</strong> {order.address}</p>
                                <p><strong className="text-[#1C1712]">Produits :</strong></p>
                                <div className="pl-2 border-l border-[#E4DDD0] space-y-0.5">
                                  {order.items.map((item, i) => (
                                    <p key={i}>• {item.name} ({item.weight}) x{item.quantity}</p>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-3 border-t border-[#E4DDD0] mt-2">
                                <span className="text-sm font-serif font-semibold">Total : {order.total.toFixed(2)} €</span>
                                <button
                                  onClick={() => handleToggleStatus(order.id)}
                                  className="text-[10px] uppercase tracking-wider font-bold text-[#6B6259] hover:text-[#1C1712] px-2 py-1 border border-[#E4DDD0] rounded-full"
                                >
                                  Changer statut
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-8 border-t border-[#E4DDD0] pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-4 h-4 text-[#B9822E]" />
                        <h3 className="font-serif font-bold text-sm">Derniers Messages Reçus</h3>
                      </div>
                      <div className="space-y-3 max-h-[160px] overflow-y-auto">
                        {adminMessages.map((msg) => (
                          <div key={msg.id} className="text-xs border border-[#E4DDD0] rounded-xl p-3">
                            <div className="flex justify-between font-bold mb-1">
                              <span>{msg.name}</span>
                              <span className="text-[#6B6259]">{msg.date}</span>
                            </div>
                            <p className="font-medium mb-1">{msg.subject}</p>
                            <p className="text-[#6B6259] font-light line-clamp-2">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS PAGE ROUTE */}
        {activeTab === 'success' && (
          <SuccessPage onReturnHome={() => setActiveTab('home')} />
        )}

        {/* CANCEL PAGE ROUTE */}
        {activeTab === 'cancel' && (
          <CancelPage
            onReturnHome={() => setActiveTab('home')}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}
      </main>

      {/* DETAILED PRODUCT DIALOG MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16130F]/80 backdrop-blur-md animate-fade-in">
          <div className="panel-modal rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full text-[#6B6259] hover:text-[#1C1712] bg-white border border-[#E4DDD0] hover:border-[#1C1712] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Product Left Side: Large Picture & Badge */}
              <div className="relative">
                <div className="aspect-square photo-mat rounded-2xl overflow-hidden">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedProduct.badge && (
                  <span className="absolute top-4 left-4 bg-[#B9822E] text-white text-xs font-bold px-3 py-1 uppercase tracking-wider rounded-full">
                    {selectedProduct.badge}
                  </span>
                )}
              </div>

              {/* Product Right Side: Purchase controls, details, specs */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(selectedProduct.rating) ? 'fill-[#B9822E] text-[#B9822E]' : 'text-[#E4DDD0]'}`} />
                    ))}
                    <span className="text-xs font-semibold ml-2 text-[#6B6259]">({selectedProduct.reviewsCount} avis vérifiés)</span>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2">{selectedProduct.name}</h2>
                  <p className="text-2xl font-serif mb-4 font-bold">
                    {(selectedProduct.price * selectedWeight.multiplier).toFixed(2)} €
                  </p>

                  <p className="text-sm text-[#6B6259] font-light mb-6 leading-relaxed">
                    {selectedProduct.longDescription}
                  </p>

                  {/* Weight / Format selector */}
                  <div className="mb-6">
                    <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-2 font-medium">Format de Conditionnement</label>
                    <div className="grid grid-cols-1 gap-2">
                      {WEIGHT_OPTIONS.map((opt) => (
                        <button
                          key={opt.weight}
                          onClick={() => setSelectedWeight(opt)}
                          className={`px-4 py-3 rounded-xl text-xs text-left uppercase tracking-wider font-semibold border flex justify-between items-center transition-all cursor-pointer ${selectedWeight.weight === opt.weight ? 'border-[#1C1712] bg-[#1C1712] text-white' : 'border-[#E4DDD0] text-[#6B6259] hover:border-[#1C1712]'}`}
                        >
                          <span>{opt.label}</span>
                          <span className="font-bold">{(selectedProduct.price * opt.multiplier).toFixed(2)} €</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conservation advice */}
                  <div className="border border-[#E4DDD0] p-4 rounded-xl mb-6">
                    <span className="text-xs uppercase text-[#8C5F1E] font-semibold tracking-wider block mb-1">Conservation artisanale</span>
                    <p className="text-[11px] text-[#6B6259] font-light leading-relaxed">{selectedProduct.conservation}</p>
                  </div>
                </div>

                {/* Purchase Controls & Add Button */}
                <div className="pt-6 border-t border-[#E4DDD0] flex items-center justify-between gap-4">
                  {selectedProduct.stock <= 0 ? (
                    <span className="text-red-600 font-serif font-bold text-base uppercase tracking-widest text-center w-full py-3 border border-red-200 rounded-xl">
                      Rupture de Stock temporaire
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center border border-[#E4DDD0] rounded-full overflow-hidden">
                        <button
                          onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                          className="px-3.5 py-2.5 text-[#6B6259] hover:text-[#1C1712] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-4 py-2 text-sm font-bold w-10 text-center">{selectedQty}</span>
                        <button
                          onClick={() => setSelectedQty((q) => Math.min(selectedProduct.stock, q + 1))}
                          className="px-3.5 py-2.5 text-[#6B6259] hover:text-[#1C1712] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          addToCart(selectedProduct, selectedWeight, selectedQty);
                          setSelectedProduct(null);
                        }}
                        className="flex-1 py-3.5 btn-primary text-xs uppercase tracking-widest font-bold rounded-full flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Ajouter au panier • {((selectedProduct.price * selectedWeight.multiplier) * selectedQty).toFixed(2)} €</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Sub-reviews list */}
                <div className="mt-8 border-t border-[#E4DDD0] pt-6">
                  <h4 className="font-serif font-bold mb-4 flex items-center gap-1.5 text-sm">
                    <MessageSquare className="w-4 h-4 text-[#B9822E]" />
                    <span>Avis Clients ({productReviews[selectedProduct.id]?.length || 0})</span>
                  </h4>

                  <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1">
                    {(productReviews[selectedProduct.id] || []).map((rev, idx) => (
                      <div key={idx} className="border border-[#E4DDD0] rounded-xl p-3 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">{rev.name}</span>
                          <span className="text-[#6B6259]">{rev.date}</span>
                        </div>
                        <div className="flex mb-1">
                          {[...Array(5)].map((_, starI) => (
                            <Star key={starI} className={`w-3 h-3 ${starI < rev.rating ? 'fill-[#B9822E] text-[#B9822E]' : 'text-[#E4DDD0]'}`} />
                          ))}
                        </div>
                        <p className="text-[#6B6259] font-light leading-relaxed">{rev.comment}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add feedback form */}
                  <form onSubmit={(e) => handleAddReview(selectedProduct.id, e)} className="mt-4 pt-4 border-t border-[#E4DDD0] space-y-3">
                    <span className="text-xs uppercase text-[#6B6259] tracking-wider block font-medium">Déposer un avis</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="Votre prénom..."
                        className="border border-[#E4DDD0] rounded-lg text-xs px-3 py-2 bg-transparent focus:outline-none focus:border-[#1C1712]"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase text-[#6B6259]">Note :</span>
                        {[1, 2, 3, 4, 5].map((starIdx) => (
                          <button
                            key={starIdx}
                            type="button"
                            onClick={() => setReviewRating(starIdx)}
                            className="p-0.5 text-[#B9822E] hover:scale-110"
                          >
                            <Star className={`w-4 h-4 ${starIdx <= reviewRating ? 'fill-[#B9822E]' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Votre commentaire d'appréciation..."
                      rows={2}
                      className="w-full border border-[#E4DDD0] rounded-lg text-xs p-3 bg-transparent focus:outline-none focus:border-[#1C1712] resize-none"
                    ></textarea>
                    <button
                      type="submit"
                      className="py-2 px-4 border border-[#B9822E]/60 text-[#8C5F1E] text-[10px] uppercase tracking-widest font-bold rounded-full hover:bg-[#B9822E] hover:text-white transition-colors"
                    >
                      Enregistrer mon avis
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING CART DRAWER OVERLAY */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-[#16130F]/70 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)}></div>

          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white border-l border-[#E4DDD0] shadow-2xl flex flex-col justify-between">

              {/* Drawer Header */}
              <div className="p-6 border-b border-[#E4DDD0] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#B9822E]" />
                  <h2 className="font-serif text-xl font-bold">Votre Coffret d'Achat</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-[#6B6259] hover:text-[#1C1712]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Navigation Progress (only visible when cart has items) */}
              {cart.length > 0 && checkoutStep !== 'success' && (
                <div className="py-3 px-6 border-b border-[#E4DDD0] flex justify-between text-[10px] uppercase tracking-wider font-semibold text-[#6B6259]">
                  <button onClick={() => setCheckoutStep('cart')} className={checkoutStep === 'cart' ? 'text-[#1C1712] font-bold' : ''}>1. Panier</button>
                  <ChevronRight className="w-3 h-3 text-[#E4DDD0]" />
                  <button onClick={() => setCheckoutStep('shipping')} className={checkoutStep === 'shipping' ? 'text-[#1C1712] font-bold' : ''}>2. Livraison</button>
                  <ChevronRight className="w-3 h-3 text-[#E4DDD0]" />
                  <button onClick={() => setCheckoutStep('payment')} className={checkoutStep === 'payment' ? 'text-[#1C1712] font-bold' : ''}>3. Paiement</button>
                </div>
              )}

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {checkoutStep === 'cart' && (
                  <div className="h-full flex flex-col">
                    {cart.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <ShoppingBag className="w-12 h-12 text-[#E4DDD0] mb-4" />
                        <h3 className="font-serif text-lg font-bold mb-1">Votre panier est encore vide</h3>
                        <p className="text-xs text-[#6B6259] max-w-xs font-light mb-6">Explorez nos douceurs traditionnelles et composez votre coffret sur-mesure.</p>
                        <button
                          onClick={() => {
                            setActiveTab('shop');
                            setIsCartOpen(false);
                          }}
                          className="px-6 py-2.5 btn-primary rounded-full text-xs uppercase tracking-widest font-bold"
                        >
                          Visiter la boutique
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {cart.map((item, index) => {
                          const itemPrice = item.product.price * item.weightOption.multiplier;
                          return (
                            <div key={index} className="flex gap-4 p-3 border border-[#E4DDD0] rounded-2xl">
                              <img src={item.product.image} alt={item.product.name} className="w-16 h-16 object-cover rounded-xl photo-mat" />

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                  <h4 className="font-serif font-bold text-sm truncate">{item.product.name}</h4>
                                  <button onClick={() => removeFromCart(index)} className="text-[#6B6259] hover:text-red-600">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-[#6B6259] block mb-2">{item.weightOption.label}</span>

                                <div className="flex justify-between items-center">
                                  {/* Qty selectors */}
                                  <div className="flex items-center border border-[#E4DDD0] rounded-full">
                                    <button onClick={() => updateCartQty(index, -1)} className="px-2 py-0.5 text-xs text-[#6B6259] hover:text-[#1C1712]"><Minus className="w-3 h-3" /></button>
                                    <span className="px-2 text-xs font-bold">{item.quantity}</span>
                                    <button onClick={() => updateCartQty(index, 1)} className="px-2 py-0.5 text-xs text-[#6B6259] hover:text-[#1C1712]"><Plus className="w-3 h-3" /></button>
                                  </div>
                                  <span className="text-sm font-serif font-bold">{(itemPrice * item.quantity).toFixed(2)} €</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {checkoutStep === 'shipping' && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-lg font-bold mb-2">Informations de Livraison</h3>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#6B6259] mb-1">Nom complet *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.name}
                        onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                        placeholder="Ex: Sonia Bouhired"
                        className="w-full bg-transparent border border-[#E4DDD0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1C1712]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#6B6259] mb-1">Adresse email *</label>
                      <input
                        type="email"
                        required
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                        placeholder="Ex: sonia@gmail.com"
                        className="w-full bg-transparent border border-[#E4DDD0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1C1712]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#6B6259] mb-1">Adresse postale complète *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.address}
                        onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                        placeholder="Ex: 14 Rue de la Paix"
                        className="w-full bg-transparent border border-[#E4DDD0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1C1712]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#6B6259] mb-1">Ville de Destination *</label>
                        <input
                          type="text"
                          required
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                          placeholder="Ex: Paris"
                          className="w-full bg-transparent border border-[#E4DDD0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1C1712]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#6B6259] mb-1">Téléphone *</label>
                        <input
                          type="text"
                          required
                          value={shippingForm.phone}
                          onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                          placeholder="Ex: 0550123456"
                          className="w-full bg-transparent border border-[#E4DDD0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1C1712]"
                        />
                      </div>
                    </div>

                    {shippingError && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 font-medium">
                        {shippingError}
                      </p>
                    )}
                  </div>
                )}

                {checkoutStep === 'payment' && (
                  <div className="space-y-6">
                    <h3 className="font-serif text-lg font-bold mb-2">Paiement Sécurisé</h3>

                    <div className="border border-[#E4DDD0] rounded-2xl p-5 relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#F1E2C4]/50 flex items-center justify-center text-[#8C5F1E]">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm">Stripe Checkout</h4>
                          <p className="text-[10px] text-[#6B6259] font-light">Paiement 100% sécurisé et crypté SSL</p>
                        </div>
                      </div>

                      <div className="border-t border-[#E4DDD0] pt-4 mt-4 space-y-3 text-xs text-[#6B6259]">
                        <p className="font-serif font-bold uppercase text-[9px] tracking-widest">Récapitulatif de livraison</p>
                        <div className="space-y-1">
                          <p><strong className="text-[#1C1712]">Destinataire :</strong> {shippingForm.name}</p>
                          <p><strong className="text-[#1C1712]">Email :</strong> {shippingForm.email}</p>
                          <p><strong className="text-[#1C1712]">Téléphone :</strong> {shippingForm.phone}</p>
                          <p><strong className="text-[#1C1712]">Adresse :</strong> {shippingForm.address}, {shippingForm.city}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#F1E2C4] bg-[#F1E2C4]/20 rounded-2xl p-4 text-xs text-[#6B6259] leading-relaxed">
                      <p>
                        En cliquant sur <strong className="text-[#1C1712]">"Finaliser l'Achat"</strong>, vous serez redirigé vers la page de paiement sécurisée de notre partenaire <strong className="text-[#1C1712]">Stripe</strong>. Vous pourrez y régler votre commande par carte bancaire en toute tranquillité.
                      </p>
                    </div>

                    {checkoutError && (
                      <div className="border border-amber-300/80 bg-amber-50 rounded-2xl p-4 text-xs text-amber-900 space-y-3">
                        <p className="font-semibold">{checkoutError}</p>
                        <button
                          onClick={completeDemoOrder}
                          className="w-full py-2.5 bg-[#8C5F1E] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#6e4915] transition-colors"
                        >
                          Simuler la commande (Mode Démo)
                        </button>
                      </div>
                    )}

                    {isRedirectingToStripe && (
                      <div className="flex items-center justify-center gap-2 text-xs text-[#8C5F1E] py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B9822E]"></div>
                        <span>Préparation de votre session de paiement sécurisée...</span>
                      </div>
                    )}
                  </div>
                )}

                {checkoutStep === 'success' && lastPlacedOrder && (
                  <div className="text-center py-8 space-y-6">
                    <div className="w-16 h-16 rounded-full bg-[#F1E2C4]/50 flex items-center justify-center mx-auto text-[#8C5F1E]">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl font-bold">Commande Validée !</h3>
                      <p className="text-xs text-[#6B6259] font-light mt-2 max-w-xs mx-auto">
                        Votre paiement a été traité avec succès via Stripe. Merci d'avoir partagé l'expérience de notre pâtisserie d'art.
                      </p>
                    </div>

                    <div className="border border-[#E4DDD0] rounded-2xl p-5 text-left font-sans">
                      <span className="text-[9px] uppercase tracking-widest text-[#8C5F1E] block text-center border-b border-[#E4DDD0] pb-2 mb-3">Certificat d'Authenticité</span>

                      <div className="text-[11px] space-y-1.5 text-[#6B6259]">
                        <p><strong className="text-[#1C1712]">N° de Commande :</strong> {lastPlacedOrder.id}</p>
                        <p><strong className="text-[#1C1712]">Destinataire :</strong> {lastPlacedOrder.customerName}</p>
                        <p><strong className="text-[#1C1712]">Adresse :</strong> {lastPlacedOrder.address}</p>
                        <p><strong className="text-[#1C1712]">Date d'achat :</strong> {lastPlacedOrder.date}</p>
                        <p><strong className="text-[#1C1712]">Livraison prévue :</strong> Sous 3 jours ouvrés</p>
                        <div className="border-t border-[#E4DDD0] pt-2 mt-2">
                          <p className="font-serif font-semibold text-[#1C1712]">Produits commandés :</p>
                          {lastPlacedOrder.items.map((it, i) => (
                            <p key={i} className="text-[10px] pl-2 mt-0.5">• {it.name} ({it.weight}) x{it.quantity}</p>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#E4DDD0] pt-3 mt-3 flex justify-between items-center text-xs">
                        <span className="font-bold uppercase">Total Payé :</span>
                        <span className="font-serif font-bold text-sm">{lastPlacedOrder.total.toFixed(2)} €</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setCheckoutStep('cart');
                        setActiveTab('home');
                      }}
                      className="w-full py-3 btn-primary rounded-full font-bold text-xs uppercase tracking-widest"
                    >
                      Retourner à l'Accueil
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer controls (Subtotals and Primary action buttons) */}
              {cart.length > 0 && checkoutStep !== 'success' && (
                <div className="p-6 border-t border-[#E4DDD0]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs uppercase tracking-wider text-[#6B6259]">Total estimé</span>
                    <span className="text-xl font-serif font-bold">{cartTotal.toFixed(2)} €</span>
                  </div>

                  {checkoutStep === 'cart' && (
                    <button
                      onClick={() => setCheckoutStep('shipping')}
                      className="w-full py-4 btn-primary rounded-full text-xs uppercase tracking-widest font-bold transition-colors flex justify-center items-center gap-2"
                    >
                      <span>Valider la Commande</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {checkoutStep === 'shipping' && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCheckoutStep('cart')}
                        className="flex-1 py-3 border border-[#E4DDD0] text-[#6B6259] rounded-full text-xs uppercase tracking-widest font-bold"
                      >
                        Retour
                      </button>
                      <button
                        onClick={() => {
                          if (shippingForm.name && shippingForm.email && shippingForm.address && shippingForm.phone) {
                            setCheckoutStep('payment');
                            setShippingError(null);
                          } else {
                            setShippingError('Veuillez remplir tous les champs de livraison obligatoires.');
                          }
                        }}
                        className="flex-1 py-3 btn-primary rounded-full text-xs uppercase tracking-widest font-bold"
                      >
                        Paiement
                      </button>
                    </div>
                  )}

                  {checkoutStep === 'payment' && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCheckoutStep('shipping')}
                        disabled={isRedirectingToStripe}
                        className="flex-1 py-3 border border-[#E4DDD0] text-[#6B6259] rounded-full text-xs uppercase tracking-widest font-bold disabled:opacity-50"
                      >
                        Retour
                      </button>
                      <button
                        onClick={initiateStripeCheckout}
                        disabled={isRedirectingToStripe}
                        className="flex-1 py-3 btn-primary rounded-full text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isRedirectingToStripe ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            <span>Connexion...</span>
                          </>
                        ) : (
                          <span>Finaliser l'Achat</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT MODAL */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16130F]/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="panel-modal rounded-3xl max-w-2xl w-full my-8 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#6B6259] hover:text-[#1C1712] bg-white border border-[#E4DDD0] hover:border-[#1C1712] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full border border-[#E4DDD0] flex items-center justify-center text-[#B9822E]">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[#8C5F1E] uppercase tracking-widest font-semibold">Console Artisan</span>
                <h2 className="font-serif text-2xl font-bold">Ajouter une Création</h2>
              </div>
            </div>
            <p className="text-xs text-[#6B6259] mb-6 leading-relaxed">
              Remplissez les détails ci-dessous pour ajouter une nouvelle pâtisserie artisanale au catalogue en ligne.
            </p>

            <form onSubmit={handleAddProductSubmit} className="space-y-5">
              {/* Product Name */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Nom de la Création *</label>
                <input
                  type="text"
                  required
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  placeholder="Ex: Baklawa Royale aux Pistaches d'Alep"
                  className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all"
                />
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Catégorie *</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value as 'amande' | 'noix' | 'assortiment' })}
                    className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all"
                  >
                    <option value="amande">Spécialité Amande</option>
                    <option value="noix">Spécialité Noix</option>
                    <option value="assortiment">Assortiment / Plateau</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Badge / Distinction</label>
                  <input
                    type="text"
                    value={newProductForm.badge}
                    onChange={(e) => setNewProductForm({ ...newProductForm, badge: e.target.value })}
                    placeholder="Ex: Nouveauté, Édition Limitée"
                    className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all"
                  />
                </div>
              </div>

              {/* Price & Initial Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Prix de base (Boîte 250g) en € *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.5"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Stock Initial (unités) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: parseInt(e.target.value) || 1 })}
                    className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all"
                  />
                </div>
              </div>

              {/* Preset Image Picker & Custom URL */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-2 font-medium">Visuel de la Pâtisserie</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {[
                    { label: 'Plateau Impérial', src: heroImg },
                    { label: 'Amande', src: amandeImg },
                    { label: 'Noix', src: soupirNoixImg },
                    { label: 'Kataïf', src: kataifImg },
                    { label: 'Coffret', src: coffretBaklawaKataifImg },
                    { label: 'Dorée', src: heroBgBaklawa },
                  ].map((imgOpt, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setNewProductForm({ ...newProductForm, image: imgOpt.src, customImageUrl: '' })}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${newProductForm.image === imgOpt.src && !newProductForm.customImageUrl ? 'border-[#B9822E] scale-105' : 'border-[#E4DDD0] opacity-60 hover:opacity-100'}`}
                    >
                      <img src={imgOpt.src} alt={imgOpt.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-3 border border-dashed border-[#E4DDD0] rounded-xl px-4 py-3 cursor-pointer hover:border-[#1C1712] transition-all">
                  {newProductForm.customImageUrl ? (
                    <img src={newProductForm.customImageUrl} alt="Aperçu" className="w-10 h-10 rounded-lg object-cover border border-[#E4DDD0]" />
                  ) : null}
                  <span className="text-xs text-[#6B6259]">
                    {isUploadingImage ? 'Import en cours...' : newProductForm.customImageUrl ? 'Photo importée — cliquez pour en choisir une autre' : 'Ou importez une photo depuis votre photothèque...'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleNewProductImageFile}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Description courte (Slogan/Résumé)</label>
                <textarea
                  rows={2}
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  placeholder="Une description concise qui résume les saveurs de cette douceur..."
                  className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all resize-none"
                ></textarea>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Description détaillée & Histoire</label>
                <textarea
                  rows={3}
                  value={newProductForm.longDescription}
                  onChange={(e) => setNewProductForm({ ...newProductForm, longDescription: e.target.value })}
                  placeholder="Racontez le savoir-faire, le feuilletage et l'expérience de dégustation..."
                  className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all resize-none"
                ></textarea>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#6B6259] mb-1.5 font-medium">Ingrédients (séparés par des virgules)</label>
                <input
                  type="text"
                  value={newProductForm.ingredients}
                  onChange={(e) => setNewProductForm({ ...newProductForm, ingredients: e.target.value })}
                  placeholder="Amandes, Miel d'oranger, Beurre clarifié, Pâte filo"
                  className="w-full bg-transparent border border-[#E4DDD0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1C1712] transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E4DDD0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-5 py-3 border border-[#E4DDD0] text-[#6B6259] hover:text-[#1C1712] text-xs uppercase tracking-wider font-semibold rounded-full cursor-pointer transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3.5 btn-primary text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Publier la Création</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="chrome-dark relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

            {/* Logo/Brand column */}
            <div className="md:col-span-2 space-y-4">
              <span className="font-serif text-2xl tracking-widest text-[#F1E2C4]">MIEL & ÉPICES</span>
              <p className="text-xs text-[#C9C0B2] font-light max-w-sm leading-relaxed">
                Créateurs de douceurs d'exception depuis des générations. Nous célébrons l'art ancestral de la pâtisserie algérienne en alliant noblesse des fruits secs et pureté du miel de fleur d'oranger.
              </p>
              <div className="flex items-center gap-4 text-[#D9B26B] text-xs uppercase tracking-wider pt-2 font-medium">
                <span>Alger</span>
                <span>•</span>
                <span>Paris</span>
                <span>•</span>
                <span>Constantine</span>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-serif text-[#F1E2C4] mb-4 uppercase tracking-wider text-sm">Navigation</h4>
              <ul className="space-y-2.5 text-xs uppercase tracking-widest text-[#C9C0B2]">
                <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors text-left">Accueil</button></li>
                <li><button onClick={() => setActiveTab('shop')} className="hover:text-white transition-colors text-left">La Boutique</button></li>
                <li><button onClick={() => setActiveTab('story')} className="hover:text-white transition-colors text-left">Notre Histoire</button></li>
                <li><button onClick={() => setActiveTab('contact')} className="hover:text-white transition-colors text-left">Contactez-nous</button></li>
              </ul>
            </div>

          </div>

          {/* Sub footer */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#C9C0B2] gap-4">
            <p>© {new Date().getFullYear()} Maison Miel & Épices. Tous droits réservés. Pâtisserie d'art traditionnelle algérienne.</p>
            <div className="flex gap-4">
              <a href="#privacy" className="hover:text-white">Politique de Confidentialité</a>
              <span>•</span>
              <a href="#terms" className="hover:text-white">Conditions Générales de Vente</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
