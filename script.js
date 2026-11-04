/* Golden Mug - local shopping cart */
(function(){
  const STORAGE_KEY = "goldenMugCartV2";
  const RUBIKA_URL = "https://rubika.ir/sajad_yousefi1317";
  // داده‌های localStorage قابل اعتماد نیستند؛ نام و قیمت را با کاتالوگ صفحه تطبیق می‌دهیم.
  function readCart(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      if(!Array.isArray(raw))return [];
      const catalog=new Map();
      document.querySelectorAll("#productGrid .product").forEach(card=>{
        const name=(card.querySelector("h3")?.textContent||"").trim();
        const priceText=card.querySelector(".price")?.textContent||"";
        const price=Number(String(priceText).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^0-9]/g,""))||0;
        if(name&&price>0)catalog.set(name,price);
      });
      const clean=[];
      raw.slice(0,50).forEach(item=>{
        if(!item||typeof item.name!=="string"||!catalog.has(item.name))return;
        const quantity=Number(item.quantity);
        if(!Number.isInteger(quantity)||quantity<1||quantity>20)return;
        clean.push({id:item.name,name:item.name,price:catalog.get(item.name),quantity});
      });
      return clean;
    }catch(e){return [];}
  }
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

  // Smart Persian product search
  const searchInput=document.getElementById("productSearch");
  const searchResults=document.getElementById("searchResults");
  const searchClear=document.getElementById("searchClear");
  const searchStatus=document.getElementById("searchStatus");
  const productCards=Array.from(document.querySelectorAll("#productGrid .product"));
  function normalizeSearch(value){
    return String(value||"").toLowerCase().replace(/[يى]/g,"ی").replace(/ك/g,"ک")
      .replace(/[\u064B-\u065F\u0670\u0640]/g,"")
      .replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d))
      .replace(/[\u200c\sـ،,؛;.!؟?()\[\]_-]+/g," ").trim();
  }
  const searchSynonyms={"ماگ":["لیوان","فنجان","کاپ","mug","cup"],"لیوان":["ماگ","فنجان","کاپ","mug"],"گربه":["cat","پیشی"],"خرگوش":["rabbit"],"خرس":["خرسی","bear"],"باب اسفنجی":["باب‌اسفنجی","spongebob","اسفنجی"],"فانتزی":["عروسکی","کارتونی","خاص"],"سرامیکی":["ceramic"],"هدیه":["کادو","تولد"]};
  const searchItems=productCards.map(card=>{
    const title=card.querySelector("h3")?.textContent||"",desc=card.querySelector(".description")?.textContent||"",img=card.querySelector("img"),price=card.querySelector(".price")?.textContent||"";
    return {card,title,desc,price,hay:normalizeSearch([title,desc,price,img?.alt||""].join(" "))};
  });
  function editDistance(a,b){
    if(Math.abs(a.length-b.length)>1)return 99;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
    return prev[b.length];
  }
  function searchScore(item,query){
    const words=normalizeSearch(query).split(" ").filter(Boolean);if(!words.length)return 1;
    let score=0,matched=0;const full=normalizeSearch(query);if(item.hay.includes(full))score+=12;
    words.forEach(word=>{let found=item.hay.includes(word);if(!found)found=(searchSynonyms[word]||[]).some(s=>item.hay.includes(normalizeSearch(s)));
      if(found){matched++;score+=4;}else if(word.length>3&&item.hay.split(" ").some(token=>token.length>3&&editDistance(word,token)<=1)){matched++;score+=2;}
    });return matched===words.length?score:0;
  }
  function runProductSearch(query){
    const q=normalizeSearch(query),ranked=searchItems.map(item=>({...item,score:searchScore(item,q)})).filter(x=>!q||x.score>0).sort((a,b)=>b.score-a.score);
    searchItems.forEach(item=>item.card.classList.toggle("search-hidden",!!q&&!ranked.some(x=>x.card===item.card)));
    if(searchStatus){searchStatus.classList.toggle("visible",!!q);searchStatus.textContent=q?(ranked.length?ranked.length.toLocaleString("fa-IR")+" محصول مرتبط پیدا شد.":"محصولی پیدا نشد؛ نام یا عبارت دیگری را امتحان کن."):"";}
    if(searchClear)searchClear.classList.toggle("visible",!!q);return ranked;
  }
  function closeSearch(){if(searchResults)searchResults.classList.remove("open");}
  function showSuggestions(query){
    if(!searchResults)return;const q=normalizeSearch(query);
    if(!q){searchResults.innerHTML='<div class="search-hint">برای مثال جستجو کن: ماگ گربه، باب اسفنجی، خرگوش، خرس یا ماگ فانتزی</div>';searchResults.classList.add("open");return;}
    const ranked=runProductSearch(query).slice(0,5);searchResults.innerHTML="";
    if(!ranked.length){searchResults.innerHTML='<div class="search-hint">نتیجه‌ای پیدا نشد. املای عبارت را بررسی کن یا کلمه کوتاه‌تری بنویس.</div>';searchResults.classList.add("open");return;}
    ranked.forEach(item=>{const button=document.createElement("button");button.type="button";button.className="search-suggestion";button.setAttribute("role","option");button.textContent=item.title;
      const small=document.createElement("small");small.textContent=item.price;button.appendChild(small);
      button.addEventListener("click",()=>{searchInput.value=item.title;runProductSearch(item.title);closeSearch();document.getElementById("products")?.scrollIntoView({behavior:"smooth"});});searchResults.appendChild(button);
    });searchResults.classList.add("open");
  }
  if(searchInput){
    searchInput.addEventListener("input",()=>showSuggestions(searchInput.value));
    searchInput.addEventListener("focus",()=>showSuggestions(searchInput.value));
    searchInput.addEventListener("keydown",e=>{
      const options=searchResults?.querySelectorAll(".search-suggestion")||[],active=searchResults?.querySelector(".search-suggestion.active");let index=Array.from(options).indexOf(active);
      if(e.key==="ArrowDown"&&options.length){e.preventDefault();index=(index+1)%options.length;options.forEach(x=>x.classList.remove("active"));options[index].classList.add("active");}
      else if(e.key==="ArrowUp"&&options.length){e.preventDefault();index=index<=0?options.length-1:index-1;options.forEach(x=>x.classList.remove("active"));options[index].classList.add("active");}
      else if(e.key==="Enter"){e.preventDefault();if(active)active.click();else{runProductSearch(searchInput.value);closeSearch();document.getElementById("products")?.scrollIntoView({behavior:"smooth"});}}
      else if(e.key==="Escape"){closeSearch();searchInput.blur();}
    });
  }
  searchClear?.addEventListener("click",()=>{searchInput.value="";runProductSearch("");closeSearch();searchInput.focus();});
  document.addEventListener("click",e=>{if(!e.target.closest("#siteSearch"))closeSearch();});
  runProductSearch("");

  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeSearch();}});
  document.addEventListener("DOMContentLoaded",updateCartCount);updateCartCount();
})();