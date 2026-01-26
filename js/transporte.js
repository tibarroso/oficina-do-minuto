import { db } from "./firebase.js";
import { collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

async function carregarTransporte(){
  const snap = await getDocs(collection(db,"pedidos"));
  const lista = document.getElementById("listaTransporte");
  lista.innerHTML="";
  snap.forEach(p=>{
    const data=p.data();
    if(["Aguardando coleta","Pronto para devolução"].includes(data.status)){
      const div=document.createElement("div");
      div.innerHTML=`OS:${p.id} | Status:${data.status}
        <button onclick="coletar('${p.id}')">Coletado</button>
        <button onclick="entregar('${p.id}')">Entregue</button>`;
      lista.appendChild(div);
    }
  });
}

window.coletar = async id => { await updateDoc(doc(db,"pedidos",id),{status:"Em transporte"}); carregarTransporte();}
window.entregar = async id => { await updateDoc(doc(db,"pedidos",id),{status:"Pronto para retirada"}); carregarTransporte(); }

carregarTransporte();
