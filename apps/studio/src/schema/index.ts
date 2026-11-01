import { careerRole, destination, featuredOnItem, film, preWeddingShoot, reactionVideo, review, teamMember, wedding, weddingPackage } from "./documents";
import { filmLink, formQuestion, galleryPhoto, reel, seo } from "./objects";
import { careersPage, enquiryForm, filmsPage, homepage, preWeddingPage, siteSettings, teamPage, weddingsPage } from "./singletons";

export const schemaTypes = [
  galleryPhoto, filmLink, reel, seo, formQuestion,
  wedding, film, destination, preWeddingShoot, teamMember, review, reactionVideo, careerRole, featuredOnItem, weddingPackage,
  homepage, weddingsPage, filmsPage, preWeddingPage, teamPage, careersPage, enquiryForm, siteSettings,
];

export const singletonTypes = new Set(["homepage", "weddingsPage", "filmsPage", "preWeddingPage", "teamPage", "careersPage", "siteSettings"]);
