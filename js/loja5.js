import { db, storage } from "./firebase.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

window.uploadAntes = async function() {
  const files = document.getElementById("fotoAntes").files;
  if(files.length === 0) return alert("Selecione ao menos 1 foto");
  for(let i=0; i<files.length; i++){
    const storageRef = ref(storage, `pedidos/OS000123/antes_${i}.jpg`);
    await uploadBytes(storageRef, files[i]);
  }
  alert("Fotos enviadas!");
}

window.criarPedido = async function(){
  const tipo = document.getElementById("tipo").value;
  const orc = document.getElementById("orcamento").checked;

  await addDoc(collection(db,"pedidos"), {
    tipoServico: tipo,
    ehOrcamento: orc,
    status: orc ? "Aguardando avaliação" : "Aguardando coleta",
    criadoEm: new Date()
  });
  alert("Pedido criado");
}
