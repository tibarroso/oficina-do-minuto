import { supabase } from "./supabase.js";

window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Login inválido");
    return;
  }

  const { data: user } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", data.user.id)
    .single();

  localStorage.setItem("perfil", user.perfil);
  window.location.href = "dashboard.html";
};
