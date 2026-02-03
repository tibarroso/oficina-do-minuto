import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!emailInput || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  try {
    // 🔹 Login no Supabase
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

    const email = user.email;

    // 🔹 Redirecionamento baseado no email
    if (email === "admin@minuto.com") {
      window.location.href = "admin.html";

    } else if (/^loja\d+@minuto\.com$/.test(email)) {
      window.location.href = "pedidos.html";

    } else if (/^transporte\d*@minuto\.com$/.test(email)) {
      window.location.href = "transporte.html";

    } else if (email === "financeiro@minuto.com") {
      window.location.href = "financeiro.html";

    } else if (/^gerente\d*@minuto\.com$/.test(email)) {
      window.location.href = "gerente.html";

    } else {
      window.location.href = "dashboard.html";
    }

  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro no login: " + (err.message || err));
  }
});
