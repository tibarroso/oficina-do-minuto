import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");
const BASE_PATH = "/oficina-do-minuto/";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!emailInput || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: senha
    });

    if (error) throw error;
    if (!user) {
      alert("Usuário não encontrado!");
      return;
    }

    // 🔹 Normaliza email
    const email = user.email.trim().toLowerCase();
    console.log("Email logado:", email); // debug

    // 🔹 Redirecionamento baseado no email
    if (email === "admin@minuto.com") {
      window.location.href = BASE_PATH + "admin.html";

    } else if (/^loja\d+@minuto\.com$/.test(email)) {
      window.location.href = BASE_PATH + "pedidos.html";

    } else if (/^transporte\d*@minuto\.com$/.test(email)) {
      window.location.href = BASE_PATH + "transporte.html";

    } else if (email === "financeiro@minuto.com") {
      window.location.href = BASE_PATH + "financeiro.html";

    } else if (/^gerente\d*@minuto\.com$/.test(email)) {
      window.location.href = BASE_PATH + "gerente.html";

    } else {
      window.location.href = BASE_PATH + "dashboard.html";
    }

  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro no login: " + (err.message || err));
  }
});
