import { localStorageRepository } from "./infrastructure/localStorageRepository.js";
import { startApp } from "./presentation/app.js";

startApp(localStorageRepository);
