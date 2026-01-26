import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { auth, db } from "./firebase.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

window.login = async function() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, senha);
    const q = query(collection(db, "usuarios"), where("uid","==", userCred.user.uid));
    const snap = await getDocs(q);
    const perfil = snap.docs[0].data().perfil;
    localStorage.setItem("perfil", perfil);
    window.location.href = "dashboard.html";
  } catch {
    alert("Login inválido");
  }
}
