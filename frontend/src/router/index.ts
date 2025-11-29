import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import PlayerProfile from "../views/PlayerProfile.vue";
import HallOfTraitorsView from "../views/HallOfTraitorsView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/player/:playerName",
      name: "player-profile",
      component: PlayerProfile,
    },
    {
      path: "/hall-of-traitors",
      name: "hall-of-traitors",
      component: HallOfTraitorsView,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

export default router;
