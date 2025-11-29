import { createRouter, createWebHistory } from "vue-router";
import AdminLogin from "../views/AdminLogin.vue";
import AdminDashboard from "../views/AdminDashboard.vue";

const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    {
      path: "/",
      name: "login",
      component: AdminLogin,
    },
    {
      path: "/console",
      name: "dashboard",
      component: AdminDashboard,
      beforeEnter: (_to, _from, next) => {
        if (localStorage.getItem("shadow_ops_token")) {
          next();
        } else {
          next("/");
        }
      },
    },
  ],
});

export default router;
