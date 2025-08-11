// PrevinirApp v3 backend — Auth (JWT), OTP SMS, Google Places, Supabase
// npm i express cors node-fetch @supabase/supabase-js dotenv bcrypt jsonwebtoken twilio
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key (apenas backend)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM;

const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const sms = (TWILIO_SID && TWILIO_TOKEN) ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

function auth(req,res,next){
  const auth = req.headers.authorization||'';
  const token = auth.startsWith('Bearer ')? auth.slice(7): null;
  if(!token) return res.status(401).json({error:'no_token'});
  try{
    const dec = jwt.verify(token, JWT_SECRET);
    req.user = dec;
    next();
  }catch(e){ return res.status(401).json({error:'bad_token'}); }
}

// --- Auth ---
app.post('/auth/register', async (req,res)=>{
  try{
    if(!supabase) return res.status(503).send('supabase_not_configured');
    const { name, email, password, cpf, phone, otp_code } = req.body||{};
    if(!name || !email || !password) return res.status(400).send('missing_fields');
    // opcional: verificar OTP
    if(phone){
      const { data: otpRow } = await supabase.from('otps').select('*').eq('phone', phone).eq('code', otp_code).eq('consumed', false).maybeSingle();
      if(!otpRow || new Date(otpRow.expires_at) < new Date()) return res.status(400).send('otp_invalid_or_expired');
      await supabase.from('otps').update({consumed:true}).eq('id', otpRow.id);
    }
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert({ name, email, password_hash: hash, cpf, phone, phone_verified: !!otp_code }).select().single();
    if(error) return res.status(400).send(error.message);
    const token = jwt.sign({ id:data.id, email:data.email, name:data.name }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user:{ id:data.id, email:data.email, name:data.name } });
  }catch(e){ res.status(500).send('register_failed'); }
});

app.post('/auth/login', async (req,res)=>{
  try{
    if(!supabase) return res.status(503).send('supabase_not_configured');
    const { email, password } = req.body||{};
    const { data:user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if(!user) return res.status(401).send('invalid');
    const ok = await bcrypt.compare(password, user.password_hash||'');
    if(!ok) return res.status(401).send('invalid');
    const token = jwt.sign({ id:user.id, email:user.email, name:user.name }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user:{ id:user.id, email:user.email, name:user.name } });
  }catch(e){ res.status(500).send('login_failed'); }
});

// --- OTP ---
app.post('/v1/otp/send', async (req,res)=>{
  try{
    if(!supabase) return res.status(503).json({error:'supabase_not_configured'});
    const phone = (req.body?.phone||'').toString();
    if(!phone) return res.status(400).json({error:'missing_phone'});
    const code = Math.floor(100000 + Math.random()*900000).toString();
    const expires = new Date(Date.now()+5*60*1000).toISOString();
    await supabase.from('otps').insert({ phone, code, expires_at: expires, consumed: false });
    if(sms){
      await sms.messages.create({ to: phone, from: TWILIO_FROM, body: `Seu código PrevinirApp: ${code}` });
      return res.json({ok:true});
    }else{
      console.log('OTP (dev):', phone, code);
      return res.json({ok:true, dev_code: code});
    }
  }catch(e){ res.status(500).json({error:'otp_send_failed'}); }
});

// --- Clinics (Google Places) ---
app.get('/v1/clinics', async (req,res)=>{
  try{
    const q = (req.query.exam||'').toString();
    const lat = req.query.lat; const lng = req.query.lng;
    if(!GOOGLE_KEY || !lat || !lng){
      return res.json({clinics:[]});
    }
    const radius = 8000; // 8km
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('key', GOOGLE_KEY);
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('keyword', q);
    url.searchParams.set('type', 'hospital');
    const r = await fetch(url.toString());
    const data = await r.json();
    const clinics = (data.results||[]).map(p=> ({
      name: p.name, address: p.vicinity || p.formatted_address, lat: p.geometry?.location?.lat, lng: p.geometry?.location?.lng
    }));
    res.json({clinics});
  }catch(e){
    res.status(500).json({error:'places_failed'});
  }
});

// --- Bookings (protected) ---
app.get('/v1/bookings', auth, async (req,res)=>{
  try{
    if(!supabase) return res.status(503).json({error:'supabase_not_configured'});
    const { data, error } = await supabase.from('bookings').select('*').eq('user_id', req.user.id).order('created_at', {ascending:false});
    if(error) return res.status(500).json({error:error.message});
    res.json(data);
  }catch(e){ res.status(500).json({error:'list_failed'}); }
});

app.post('/v1/bookings', auth, async (req,res)=>{
  try{
    if(!supabase) return res.status(503).json({error:'supabase_not_configured'});
    const payload = {
      created_at: new Date().toISOString(),
      user_id: req.user.id,
      user_email: req.user.email,
      exam: req.body?.exam,
      clinic_name: req.body?.clinic?.name,
      clinic_address: req.body?.clinic?.address,
      clinic_lat: req.body?.clinic?.lat,
      clinic_lng: req.body?.clinic?.lng
    };
    const { data, error } = await supabase.from('bookings').insert(payload).select().single();
    if(error) return res.status(500).json({error:error.message});
    res.json({ok:true, booking:data});
  }catch(e){ res.status(500).json({error:'book_failed'}); }
});

app.listen(PORT, ()=>console.log(`PrevinirApp backend on http://localhost:${PORT}`));
