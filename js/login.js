import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");
const BASE_PATH = "/oficina-do-minuto/";

const rolesMap = [
  { pattern: /^admin@minuto\.com$/i, page: "admin.html" },
  { pattern: /^loja\d+@minuto\.com$/i, page: "pedidos.html" },
  { pattern: /^transporte\d*@minuto\.com$/i, page: "transporte.html" },
  { pattern: /^financeiro@minuto\.com$/i, page: "financeiro.html" },
  { pattern: /^gerente\d*@minuto\.com$/i, page: "gerente.html" }
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: senha
    });

    if (error) throw error;
    if (!data.session) {
      alert("Usuário ou senha inválidos!");
      return;
    }

    // 🔹 Email logado
    const email = (data.session.user.email || "").trim().toLowerCase();
    console.log("Email logado:", email); // debug

    // 🔹 Redirecionamento baseado no mapa de roles
    const role = rolesMap.find(r => r.pattern.test(email));
    if (role) {
      window.location.href = BASE_PATH + role.page;
    } else {
      window.location.href = BASE_PATH + "dashboard.html";
    }

  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro no login: " + (err.message || err));
  }
});
