/* Golden Mug account page
 * After deploying the Flask API, set API_BASE to its HTTPS address.
 * Example: const API_BASE = "https://api.your-domain.example";
 */
const API_BASE = "";
const $ = (id) => document.getElementById(id);
const message = $("message");
function say(text){message.textContent=text;}
function tab(which){
  $("loginForm").classList.toggle("hidden",which!=="login");
  $("registerForm").classList.toggle("hidden",which!=="register");
  $("loginTab").classList.toggle("active",which==="login");
  $("registerTab").classList.toggle("active",which==="register");
}
$("loginTab").onclick=()=>tab("login");
$("registerTab").onclick=()=>tab("register");
async function api(path, options={}){
  if(!API_BASE) throw new Error("این صفحه فعلاً پیش‌نمایش است؛ ابتدا باید آدرس HTTPS بک‌اند تنظیم شود.");
  const response=await fetch(API_BASE+path,{...options,credentials:"include",headers:{"Content-Type":"application/json",...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||"ارتباط با سرور ناموفق بود.");
  return data;
}
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);
 try{await api("/api/login",{method:"POST",body:JSON.stringify({username:f.get("username"),password:f.get("password")})});say("ورود موفق بود.");await loadProfile();}
 catch(err){say(err.message);}
});
$("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);
 try{await api("/api/register",{method:"POST",body:JSON.stringify({username:f.get("username"),password:f.get("password"),full_name:f.get("full_name"),phone:f.get("phone")})});say("حساب ساخته شد.");await loadProfile();}
 catch(err){say(err.message);}
});
async function loadProfile(){
 try{
  const data=await api("/api/me");
  $("profile").classList.remove("hidden");
  $("profileInfo").textContent=data.user.full_name+" — نام کاربری: "+data.user.username;
  const orders=await api("/api/orders");
  $("orders").textContent="";
  if(!orders.orders.length){$("orders").textContent="هنوز سفارشی ثبت نشده است.";return;}
  orders.orders.forEach(o=>{const div=document.createElement("div");div.className="order";div.textContent="کد پیگیری: "+o.tracking_code+" | وضعیت: "+o.status+" | مبلغ: "+Number(o.total_price).toLocaleString("fa-IR")+" تومان";$("orders").appendChild(div);});
 }catch(err){$("profile").classList.add("hidden");say(err.message);}
}
$("logout").onclick=async()=>{try{await api("/api/logout",{method:"POST"});$("profile").classList.add("hidden");say("از حساب خارج شدی.");}catch(err){say(err.message);}};
