import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");
const BASE_PATH = "/oficina-do-minuto/";

// 🔹 Mapa de roles → pattern (regex ou string) : página de destino
const rolesMap = [
  { pattern: /^admin@minuto\.com$/, page: "admin.html" },
  { pattern: /^loja\d+@minuto\.com$/, page: "pedidos.html" },
  { pattern: /^transporte\d*@minuto\.com$/, page: "transporte.html" },
  { pattern: /^financeiro@minuto\.com$/, page: "financeiro.html" },
  { pattern: /^gerente\d*@minuto\.com$/, page: "gerente.html" }
];

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!emailInput || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
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

    // 🔹 Encontra o role correspondente
    const role = rolesMap.find(r => r.pattern.test(email));

    if (role) {
      window.location.href = BASE_PATH + role.page;
    } else {
      // fallback
      window.location.href = BASE_PATH + "dashboard.html";
    }

  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro no login: " + (err.message || err));
  }
});
