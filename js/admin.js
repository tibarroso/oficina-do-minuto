import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

async function gerarRelatorio(){
  const snap=await getDocs(collection(db,"pedidos"));
  const rel=document.getElementById("relatorio");
  rel.innerHTML="<h3>Todos os pedidos</h3>";
  snap.forEach(p=>{
    const d=p.data();
    rel.innerHTML+=`OS:${p.id} | Serviço:${d.tipoServico} | Status:${d.status} | Orçamento:${d.ehOrcamento}<br>`;
  });
}
gerarRelatorio();
