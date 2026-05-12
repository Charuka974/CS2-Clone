
/* =========================
   ENVIRONMENTS
========================= */

const maps = [

{
    name:"DAY",
    bg:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920",
    accent:"#00ff9d"
},

{
    name:"NIGHT",
    bg:"https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920",
    accent:"#7c83ff"
},

{
    name:"JUNGLE",
    bg:"https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920",
    accent:"#30ff8a"
},

{
    name:"WINTER",
    bg:"https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=1920",
    accent:"#9be7ff"
},

{
    name:"RAIN",
    bg:"https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1920",
    accent:"#00d0ff"
}

];

const bg = document.getElementById("bg");

function loadDefaultMap(){
    bg.style.backgroundImage = `url('${maps[0].bg}')`;
}

loadDefaultMap();

function changeMap(index,el){

    const map = maps[index];

    bg.style.backgroundImage = `url('${map.bg}')`;

    document.documentElement.style.setProperty('--accent',map.accent);

    document.querySelectorAll(".map-btn").forEach(btn=>{
        btn.classList.remove("active");
    });

    el.classList.add("active");

}

/* =========================
   PARTICLES
========================= */

const particles = document.getElementById("particles");

function createParticles(){

    for(let i=0;i<45;i++){

        const p = document.createElement("div");

        p.classList.add("particle");

        const size = Math.random()*4+1;

        p.style.width = size + "px";
        p.style.height = size + "px";

        p.style.left = Math.random()*100 + "%";

        p.style.bottom = "-20px";

        p.style.animationDuration =
        (Math.random()*10+10)+"s";

        p.style.animationDelay =
        (Math.random()*5)+"s";

        particles.appendChild(p);

    }

}

createParticles();

/* =========================
   FIND MATCH
========================= */

const findBtn = document.getElementById("findBtn");

let searching = false;

findBtn.addEventListener("click",()=>{

    if(searching) return;

    searching = true;

    findBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin mr-2"></i>
    SEARCHING...
    `;

    findBtn.style.opacity = ".8";

    setTimeout(()=>{

        findBtn.innerHTML = `
        <i class="fa-solid fa-check mr-2"></i>
        MATCH FOUND
        `;

        setTimeout(()=>{

            alert(`
🎮 MATCH FOUND

MAP: MIRAGE REMASTERED
MODE: COMPETITIVE 5v5
PING: 21ms
SERVER: ASIA
            `);

            findBtn.innerHTML = `
            <i class="fa-solid fa-rocket mr-2"></i>
            FIND MATCH
            `;

            findBtn.style.opacity = "1";

            searching = false;

        },1200);

    },2500);

});

/* =========================
   RAIN LIGHTNING EFFECT
========================= */

setInterval(()=>{

    const currentAccent =
    getComputedStyle(document.documentElement)
    .getPropertyValue('--accent');

    if(currentAccent.includes("00d0ff")){

        bg.style.filter =
        "brightness(2) contrast(1.3)";

        setTimeout(()=>{

            bg.style.filter =
            "brightness(1)";

        },120);

    }

},5000);

console.log(
"%cCS2 Tactical Lobby Loaded",
"color:#00ff9d;font-size:14px;font-family:monospace"
);
