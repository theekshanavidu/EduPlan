import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, updatePassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------------- FIREBASE ----------------
const firebaseConfig = {
  apiKey: "AIzaSyDYhulc8Qz_xGfIeb1g9A6BGO2wwbrz82M",
  authDomain: "study-9c374.firebaseapp.com",
  projectId: "study-9c374",
  storageBucket: "study-9c374.appspot.com",
  messagingSenderId: "82946998504",
  appId: "1:82946998504:web:290cd36a2559846891095d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "m1rddMA36WbVunFW3B0BzuqOwyI2"; // set your admin UID

let currentUser = null;

// ---------------- HELPER ----------------
function el(tag, attrs={}, children=[]){
  const e=document.createElement(tag);
  for(const k in attrs){
      if(k==="cls") e.className=attrs[k];
      else if(k==="html") e.innerHTML=attrs[k];
      else e.setAttribute(k, attrs[k]);
  }
  if(typeof children==="string") e.textContent=children;
  else children.forEach(c => e.appendChild(typeof c==="string"?document.createTextNode(c):c));
  return e;
}

const root = document.getElementById("root");

// ---------------- AUTH ----------------
document.addEventListener("DOMContentLoaded", renderLanding);
onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(user){
    if(user.uid===ADMIN_UID){
      renderAdminDashboard();
    }else{
      renderDashboard();
    }
  }
});

// ---------------- LANDING ----------------
function renderLanding(){
  if(!root) return;
  root.innerHTML="";

  const frame = el("div",{cls:"app-frame"});
  const top = el("div",{cls:"topbar"},[ el("div",{cls:"brand"},"StudyTracker") ]);
  frame.appendChild(top);

  const panel = el("div",{cls:"split-container panel"});
  const left = el("div",{cls:"left"},[
    el("h2",{},["WELCOME BACK!"]),
    el("p",{},["Login or sign up to continue."])
  ]);
  const right = el("div",{cls:"right"});

  const login = el("form",{id:"login-form"});
  login.append(
    el("div",{cls:"form-field"},[el("label",{},["Email"]), el("input",{name:"email",type:"email",required:true})]),
    el("div",{cls:"form-field"},[el("label",{},["Password"]), el("input",{name:"password",type:"password",required:true})]),
    el("button",{cls:"neon-btn",type:"submit"},"Login"),
    el("div",{cls:"small-link",html:`No account? <a href="#" id="go-sign">Sign up</a>`})
  );

  const signup = el("form",{id:"signup-form",style:"display:none"});
  signup.append(
    el("div",{cls:"form-field"},[ el("label",{},["First Name"]), el("input",{name:"firstName",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["Last Name"]), el("input",{name:"lastName",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["Birthday"]), el("input",{name:"birthday",type:"date",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["School"]), el("input",{name:"school",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["Phone"]), el("input",{name:"phone",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["Exam Year"]), el("input",{name:"examYear",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["Email"]), el("input",{name:"email",type:"email",required:true}) ]),
    el("div",{cls:"form-field"},[ el("label",{},["Password"]), el("input",{name:"password",type:"password",required:true}) ]),
    el("button",{cls:"neon-btn",type:"submit"},"Sign Up"),
    el("div",{cls:"small-link",html:`Have an account? <a href="#" id="go-login">Login</a>`})
  );

  right.append(login,signup);
  panel.append(left,right);
  frame.append(panel);
  root.append(frame);

  document.getElementById("go-sign").onclick=e=>{e.preventDefault(); signup.style.display="block"; login.style.display="none";}
  document.getElementById("go-login").onclick=e=>{e.preventDefault(); signup.style.display="none"; login.style.display="block";}

  login.onsubmit=async e=>{
    e.preventDefault();
    try{ await signInWithEmailAndPassword(auth,e.target.email.value,e.target.password.value); }
    catch(err){ alert(err.message);}
  };

  signup.onsubmit=async e=>{
    e.preventDefault();
    const f=e.target;
    try{
      const cred = await createUserWithEmailAndPassword(auth,f.email.value,f.password.value);
      await updateProfile(cred.user,{displayName:f.firstName.value+" "+f.lastName.value});
      await setDoc(doc(db,"users",cred.user.uid),{
        firstName:f.firstName.value,lastName:f.lastName.value,
        birthday:f.birthday.value,school:f.school.value,
        phone:f.phone.value,examYear:f.examYear.value,
        email:f.email.value,createdAt:new Date().toISOString()
      });
    }catch(err){alert(err.message);}
  };
}

// ---------------- USER DASHBOARD ----------------
async function renderDashboard(){
  root.innerHTML="";
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"});
  const brand=el("div",{cls:"brand"},"StudyTracker");
  const btnProfile=el("button",{cls:"neon-btn"},"Profile");
  const btnLogout=el("button",{cls:"neon-btn"},"Logout");
  top.append(brand,btnProfile,btnLogout);
  frame.append(top);

  const dashboard=el("div",{cls:"dashboard"});
  const dateTime=el("div",{cls:"card"});
  dashboard.append(dateTime);
  function updateTime(){ dateTime.textContent=new Date().toLocaleString(); }
  setInterval(updateTime,1000); updateTime();

  const studyForm=el("div",{cls:"card"});
  const inputDate=el("input",{type:"date",id:"study-date"});
  const inputHours=el("input",{type:"number",id:"study-hours",min:0,max:24,placeholder:"Hours"});
  const btnAdd=el("button",{cls:"neon-btn"},"Add/Update");
  studyForm.append(el("label",{},["Select Date:"]),inputDate,el("label",{},["Hours:"]),inputHours,btnAdd);
  dashboard.append(studyForm);

  const chartWeekly=el("canvas",{id:"weeklyChart",cls:"mt-4"});
  const chartMonthly=el("canvas",{id:"monthlyChart",cls:"mt-4"});
  dashboard.append(chartWeekly,chartMonthly);

  frame.append(dashboard);
  root.append(frame);

  btnLogout.onclick=async ()=>{ await signOut(auth); renderLanding(); }
  btnProfile.onclick=()=>{ renderProfile(); }

  btnAdd.onclick=async ()=>{
    const dateVal=inputDate.value;
    let hoursVal=parseFloat(inputHours.value);
    if(!dateVal || isNaN(hoursVal) || hoursVal<0) { alert("Enter valid date"); return; }
    if(hoursVal>24) hoursVal=24;
    const docRef=doc(db,"studyLogs",currentUser.uid+"_"+dateVal);
    await setDoc(docRef,{userId:currentUser.uid,date:dateVal,hours:hoursVal,createdAt:new Date().toISOString()});
    inputHours.value=""; inputDate.value="";
    loadCharts();
  };

  async function loadCharts(){
    const q=query(collection(db,"studyLogs"),where("userId","==",currentUser.uid));
    const snapshot=await getDocs(q);
    const logs=[];
    snapshot.forEach(d=>logs.push(d.data()));

    // Weekly chart (current week Mon-Sun)
    const weekDates=[];
    const today=new Date();
    const currDay=today.getDay(); // 0 Sun - 6 Sat
    const monday=new Date(today); monday.setDate(today.getDate() - (currDay||7)+1);
    for(let i=0;i<7;i++){
      const d=new Date(monday); d.setDate(monday.getDate()+i);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    const weekData=weekDates.map(d=>{
      const log=logs.find(l=>l.date===d);
      return log?log.hours:0;
    });
    if(window.wChart) window.wChart.destroy();
    window.wChart=new Chart(chartWeekly,{type:'line',data:{labels:weekDates,datasets:[{label:'Hours',data:weekData,borderColor:'cyan',backgroundColor:'rgba(0,240,239,0.2)'}]},options:{responsive:true,plugins:{legend:{display:false}}}});

    // Monthly chart
    const monthLabels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthData=new Array(12).fill(0);
    logs.forEach(l=>{
      const d=new Date(l.date);
      if(d.getFullYear()===today.getFullYear()) monthData[d.getMonth()]+=l.hours;
    });
    if(window.mChart) window.mChart.destroy();
    window.mChart=new Chart(chartMonthly,{type:'line',data:{labels:monthLabels,datasets:[{label:'Hours',data:monthData,borderColor:'cyan',backgroundColor:'rgba(0,240,239,0.2)'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  }

  loadCharts();
}

// ---------------- PROFILE ----------------
async function renderProfile(){
  if(!currentUser) return;
  root.innerHTML="";
  const docSnap=await getDoc(doc(db,"users",currentUser.uid));
  const userData=docSnap.exists()?docSnap.data():{};
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"});
  const brand=el("div",{cls:"brand"},"Profile");
  const btnBack=el("button",{cls:"neon-btn"},"Back");
  top.append(brand,btnBack);
  frame.append(top);

  const container=el("div",{cls:"dashboard"});
  container.append(
    el("div",{cls:"form-field"},[el("label",{},["First Name"]), el("input",{name:"firstName",value:userData.firstName||""})]),
    el("div",{cls:"form-field"},[el("label",{},["Last Name"]), el("input",{name:"lastName",value:userData.lastName||""})]),
    el("div",{cls:"form-field"},[el("label",{},["Birthday"]), el("input",{type:"date",name:"birthday",value:userData.birthday||""})]),
    el("div",{cls:"form-field"},[el("label",{},["School"]), el("input",{name:"school",value:userData.school||""})]),
    el("div",{cls:"form-field"},[el("label",{},["Phone"]), el("input",{name:"phone",value:userData.phone||""})]),
    el("div",{cls:"form-field"},[el("label",{},["Exam Year"]), el("input",{name:"examYear",value:userData.examYear||""})]),
    el("div",{cls:"form-field"},[el("label",{},["Email (readonly)"]), el("input",{name:"email",value:userData.email||"",readonly:true})]),
    el("div",{cls:"form-field"},[el("label",{},["Password"]), el("input",{type:"password",name:"password",placeholder:"Leave empty if not changing"})])
  );
  const btnSave=el("button",{cls:"neon-btn"},"Save Changes");
  container.append(btnSave);
  frame.append(container);
  root.append(frame);

  btnBack.onclick=()=>renderDashboard();
  btnSave.onclick=async ()=>{
    const inputs=container.querySelectorAll("input");
    const updated={};
    inputs.forEach(inp=>{if(inp.name!=="email" && inp.value) updated[inp.name]=inp.value;});
    try{
      await updateDoc(doc(db,"users",currentUser.uid),updated);
      if(updated.password) await updatePassword(currentUser,updated.password);
      alert("Profile updated!"); renderDashboard();
    }catch(err){ alert(err.message);}
  };
}

// ---------------- ADMIN DASHBOARD ----------------
async function renderAdminDashboard(){
  root.innerHTML="";
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"});
  const brand=el("div",{cls:"brand"},"Admin Dashboard");
  const btnLogout=el("button",{cls:"neon-btn"},"Logout");
  top.append(brand,btnLogout);
  frame.append(top);

  const container=el("div",{cls:"dashboard"});
  const usersList=el("div",{cls:"user-list card"});
  container.append(usersList);
  frame.append(container);
  root.append(frame);

  btnLogout.onclick=async ()=>{ await signOut(auth); renderLanding(); }

  async function loadUsers(){
    usersList.innerHTML="";
    const q=collection(db,"users");
    const snap=await getDocs(q);
    snap.forEach(docSnap=>{
      const data=docSnap.data();
      const uid=docSnap.id;
      const userItem=el("div",{cls:"user-item"},[
        el("div",{},`${data.firstName} ${data.lastName} (${data.email})`),
        el("div",{},[
          el("button",{cls:"neon-btn"},"View",onclick:()=>renderUserView(uid)),
          el("button",{cls:"neon-btn"},"Delete",onclick:async ()=>{
            if(confirm("Delete user?")){
              await deleteDoc(doc(db,"users",uid));
              alert("Deleted"); loadUsers();
            }
          })
        ])
      ]);
      usersList.append(userItem);
    });
  }

  loadUsers();
}

async function renderUserView(uid){
  root.innerHTML="";
  const docSnap=await getDoc(doc(db,"users",uid));
  const userData=docSnap.data();
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"});
  const brand=el("div",{cls:"brand"},`${userData.firstName} ${userData.lastName}`);
  const btnBack=el("button",{cls:"neon-btn"},"Back");
  top.append(brand,btnBack);
  frame.append(top);

  const dashboard=el("div",{cls:"dashboard"});
  const chartWeekly=el("canvas",{id:"weeklyChart",cls:"mt-4"});
  const chartMonthly=el("canvas",{id:"monthlyChart",cls:"mt-4"});
  dashboard.append(chartWeekly,chartMonthly);
  frame.append(dashboard);
  root.append(frame);

  btnBack.onclick=()=>renderAdminDashboard();

  async function loadCharts(){
    const q=query(collection(db,"studyLogs"),where("userId","==",uid));
    const snapshot=await getDocs(q);
    const logs=[];
    snapshot.forEach(d=>logs.push(d.data()));

    // Weekly chart
    const weekDates=[];
    const today=new Date();
    const currDay=today.getDay();
    const monday=new Date(today); monday.setDate(today.getDate() - (currDay||7)+1);
    for(let i=0;i<7;i++){
      const d=new Date(monday); d.setDate(monday.getDate()+i);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    const weekData=weekDates.map(d=>{
      const log=logs.find(l=>l.date===d);
      return log?log.hours:0;
    });
    if(window.wChart) window.wChart.destroy();
    window.wChart=new Chart(chartWeekly,{type:'line',data:{labels:weekDates,datasets:[{label:'Hours',data:weekData,borderColor:'cyan',backgroundColor:'rgba(0,240,239,0.2)'}]},options:{responsive:true,plugins:{legend:{display:false}}}});

    // Monthly chart
    const monthLabels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthData=new Array(12).fill(0);
    logs.forEach(l=>{
      const d=new Date(l.date);
      if(d.getFullYear()===today.getFullYear()) monthData[d.getMonth()]+=l.hours;
    });
    if(window.mChart) window.mChart.destroy();
    window.mChart=new Chart(chartMonthly,{type:'line',data:{labels:monthLabels,datasets:[{label:'Hours',data:monthData,borderColor:'cyan',backgroundColor:'rgba(0,240,239,0.2)'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  }

  loadCharts();
}
