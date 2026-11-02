/* Golden Mug - local shopping cart */
(function(){
  const STORAGE_KEY = "goldenMugCartV2";
  const RUBIKA_URL = "https://rubika.ir/sajad_yousefi1317";
  function readCart(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch(e){return [];}}
  function saveCart(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));updateCartCount();}
  function digitsToNumber(value){
    const p="۰۱۲۳۴۵۶۷۸۹",a="٠١٢٣٤٥٦٧٨٩";
    return Number(String(value).replace(/[۰-۹]/g,d=>p.indexOf(d)).replace(/[٠-٩]/g,d=>a.indexOf(d)).replace(/[^0-9]/g,""))||0;
  }
  function money(value){return Number(value).toLocaleString("fa-IR")+" تومان";}
  window.updateCartCount=function(){
    const badge=document.getElementById("cartCount");
    if(badge)badge.textContent=readCart().reduce((n,x)=>n+x.quantity,0).toLocaleString("fa-IR");
  };
  window.buyProduct=function(name,priceText){
    const price=digitsToNumber(priceText),items=readCart(),old=items.find(x=>x.id===name);
    if(old)old.quantity++;else items.push({id:name,name,price,quantity:1});
    saveCart(items);openCart();
  };
  window.openCart=function(){const panel=document.getElementById("cartPanel");if(panel)panel.classList.add("open");renderCart();};
  window.closeCart=function(){const panel=document.getElementById("cartPanel");if(panel)panel.classList.remove("open");};
  function renderCart(){
    const area=document.getElementById("cartItems"),totalEl=document.getElementById("cartTotal");
    if(!area||!totalEl)return;
    const items=readCart();area.innerHTML="";
    if(!items.length){area.innerHTML='<div class="cart-empty">سبد خریدت هنوز خالیه.<br>از بین محصولات، چیزی که دوست داری انتخاب کن.</div>';totalEl.textContent="جمع کل: ۰ تومان";return;}
    let total=0;
    items.forEach(item=>{
      total+=item.price*item.quantity;
      const row=document.createElement("div");row.className="cart-row";
      const info=document.createElement("div"),name=document.createElement("div"),price=document.createElement("div");
      name.className="cart-name";name.textContent=item.name;
      price.className="cart-price";price.textContent=money(item.price)+" برای هر عدد";
      info.append(name,price);
      const controls=document.createElement("div");controls.className="cart-controls";
      const minus=document.createElement("button");minus.type="button";minus.textContent="−";minus.onclick=()=>changeQuantity(item.id,-1);
      const qty=document.createElement("span");qty.textContent=item.quantity.toLocaleString("fa-IR");
      const plus=document.createElement("button");plus.type="button";plus.textContent="+";plus.onclick=()=>changeQuantity(item.id,1);
      const remove=document.createElement("button");remove.type="button";remove.className="remove-item";remove.textContent="حذف";remove.onclick=()=>removeItem(item.id);
      controls.append(minus,qty,plus,remove);row.append(info,controls);area.appendChild(row);
    });
    totalEl.textContent="جمع کل: "+money(total);
  }
  function changeQuantity(id,delta){const items=readCart(),item=items.find(x=>x.id===id);if(!item)return;item.quantity+=delta;saveCart(items.filter(x=>x.quantity>0));renderCart();}
  function removeItem(id){saveCart(readCart().filter(x=>x.id!==id));renderCart();}
  window.clearCart=function(){if(readCart().length&&confirm("همه محصولات از سبد خرید حذف شوند؟")){saveCart([]);renderCart();}};
  window.checkoutCart=async function(){
    const items=readCart();if(!items.length){alert("سبد خرید خالی است.");return;}
    const lines=items.map(x=>"• "+x.name+" × "+x.quantity+" — "+money(x.price*x.quantity));
    const total=items.reduce((n,x)=>n+x.price*x.quantity,0);
    const message="سلام، برای ثبت سفارش از گلدن ماگ پیام می‌دهم.\n\n"+lines.join("\n")+"\n\nجمع کل: "+money(total)+"\nلطفاً برای هماهنگی سفارش راهنمایی‌ام کنید.";
    let copied=false;
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(message);copied=true;}}catch(e){}
    if(!copied){const t=document.createElement("textarea");t.value=message;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{copied=document.execCommand("copy");}catch(e){}t.remove();}
    alert(copied?"متن سفارش کپی شد. در صفحه روبیکا آن را ارسال کن.":"صفحه روبیکا باز می‌شود؛ متن سفارش را از سبد خرید کپی کن.");
    window.open(RUBIKA_URL,"_blank","noopener");
  };
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCart();});
  document.addEventListener("DOMContentLoaded",updateCartCount);updateCartCount();
})();