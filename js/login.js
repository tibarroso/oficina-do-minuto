import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  // Login no Supabase
  const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    console.error("Erro no login:", error);
    alert("Erro no login: " + error.message);
    return;
  }

  if (!user) {
    alert("Usuário não encontrado!");
    return;
  }

  // 🔹 Redirecionamento baseado no email
  if (user.email === "admin@minuto.com") {
    window.location.href = "admin.html";
  } else if (user.email.startsWith("loja")) {
    // todas as lojas com email lojaX@minuto.com
    window.location.href = "pedidos.html";
  } else if (user.email.startsWith("transporte")) {
    window.location.href = "transporte.html";
  } else {
    // fallback
    window.location.href = "dashboard.html";
  }
});
