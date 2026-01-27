const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: senha
});

if(error){
  alert("Erro no login: " + error.message);
  return;
}

// Redirecionamento baseado no tipo de usuário
if(user.email === "admin@minuto.com"){
  window.location.href = "admin.html"; // admin
} else if(user.email.includes("loja")) {
  window.location.href = "pedidos.html"; // loja faz pedidos
} else if(user.email.includes("transporte")) {
  window.location.href = "transporte.html"; // transporte
} else {
  window.location.href = "dashboard.html"; // fallback
}
