/* Golden Mug customer account: real API, no fake/local account storage. */
const API_BASE = (window.GOLDEN_MUG_API_BASE || "").replace(/\/$/, "");
const $ = (id) => document.getElementById(id);
const message = $("message");
let csrfToken = "";
function say(text){ if(message) message.textContent = text; }
function tab(which){
  $("loginForm").classList.toggle("hidden", which !== "login");
  $("registerForm").classList.toggle("hidden", which !== "register");
  $("loginTab").classList.toggle("active", which === "login");
  $("registerTab").classList.toggle("active", which === "register");
}
$("loginTab").onclick = () => tab("login");
$("registerTab").onclick = () => tab("register");
async function refreshCsrf(){
  if(!API_BASE || API_BASE.includes("YOUR-RENDER-SERVICE")){
    throw new Error("آدرس سرور هنوز تنظیم نشده؛ ابتدا بک‌اند را در Render منتشر کن و آدرس آن را در config.js بگذار.");
  }
  const response = await fetch(API_BASE + "/api/csrf", {credentials:"include"});
  const data = await response.json().catch(()=>({}));
  if(!response.ok || !data.csrf_token) throw new Error("ارتباط امن با سرور برقرار نشد.");
  csrfToken = data.csrf_token;
}
async function api(path, options={}){
  if(!API_BASE || API_BASE.includes("YOUR-RENDER-SERVICE")) throw new Error("آدرس سرور هنوز در config.js تنظیم نشده است.");
  const method = (options.method || "GET").toUpperCase();
  const headers = {"Content-Type":"application/json", ...(options.headers || {})};
  if(["POST","PATCH","PUT","DELETE"].includes(method)){
    if(!csrfToken) await refreshCsrf();
    headers["X-CSRF-Token"] = csrfToken;
  }
  const response = await fetch(API_BASE + path, {...options, credentials:"include", headers});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || "ارتباط با سرور ناموفق بود.");
  if(data.csrf_token) csrfToken = data.csrf_token;
  return data;
}
$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const submit = e.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true; say("در حال ورود...");
  try{
    await api("/api/login",{method:"POST",body:JSON.stringify({
      username:form.get("username"), password:form.get("password")
    })});
    say("ورود موفق بود."); await loadProfile();
  }catch(error){say(error.message);}
  finally{submit.disabled=false;}
});
$("registerForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const submit = e.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true; say("در حال ساخت حساب امن...");
  try{
    await api("/api/register",{method:"POST",body:JSON.stringify({
      username:form.get("username"), password:form.get("password"),
      full_name:form.get("full_name"), phone:form.get("phone")
    })});
    e.currentTarget.reset(); say("حساب کاربری با موفقیت ساخته شد."); await loadProfile();
  }catch(error){say(error.message);}
  finally{submit.disabled=false;}
});
async function loadProfile(){
  try{
    const data = await api("/api/me");
    $("profile").classList.remove("hidden");
    $("profileInfo").textContent = data.user.full_name + " — نام کاربری: " + data.user.username;
    const result = await api("/api/orders");
    $("orders").textContent = "";
    if(!result.orders.length){$("orders").textContent="هنوز سفارشی ثبت نشده است.";return;}
    result.orders.forEach(order=>{
      const div=document.createElement("div"); div.className="order";
      div.textContent="کد پیگیری: "+order.tracking_code+" | وضعیت: "+order.status+
        " | مبلغ: "+Number(order.total_price).toLocaleString("fa-IR")+" تومان";
      $("orders").appendChild(div);
    });
  }catch(error){$("profile").classList.add("hidden");say(error.message);}
}
$("logout").onclick=async()=>{
  try{await api("/api/logout",{method:"POST"});$("profile").classList.add("hidden");say("از حساب خارج شدی.");}
  catch(error){say(error.message);}
};
if(API_BASE && !API_BASE.includes("YOUR-RENDER-SERVICE")){
  refreshCsrf().then(loadProfile).catch(error=>say(error.message));
}else{
  say("صفحه حساب آماده است؛ پس از انتشار بک‌اند، آدرس آن را در config.js تنظیم کن.");
}
