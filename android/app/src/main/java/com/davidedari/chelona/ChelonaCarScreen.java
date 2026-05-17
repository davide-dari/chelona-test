package com.davidedari.chelona;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import org.json.JSONArray;
import org.json.JSONObject;

public class ChelonaCarScreen extends Screen {
    public ChelonaCarScreen(CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        // Legge gli indirizzi dalle SharedPreferences
        SharedPreferences prefs = getCarContext().getSharedPreferences("ChelonaPrefs", Context.MODE_PRIVATE);
        String jsonStr = prefs.getString("address_book", null);

        if (jsonStr != null) {
            try {
                JSONArray arr = new JSONArray(jsonStr);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    final String title = obj.optString("title", "Indirizzo");
                    final String query = obj.optString("query", "");

                    listBuilder.addItem(
                        new Row.Builder()
                            .setTitle(title)
                            .addText(query)
                            .setOnClickListener(() -> {
                                // Avvia la navigazione
                                Uri gmmIntentUri = Uri.parse("geo:0,0?q=" + Uri.encode(query));
                                Intent mapIntent = new Intent(Intent.ACTION_VIEW, gmmIntentUri);
                                getCarContext().startCarApp(mapIntent);
                            })
                            .build()
                    );
                }
            } catch (Exception e) {
                listBuilder.addItem(
                    new Row.Builder()
                        .setTitle("Errore di caricamento")
                        .addText("Si è verificato un problema nel leggere gli indirizzi.")
                        .build()
                );
            }
        }

        if (listBuilder.build().getItems().isEmpty()) {
            listBuilder.addItem(
                new Row.Builder()
                    .setTitle("Nessun indirizzo in rubrica")
                    .addText("Apri Chelona sul telefono per salvare i tuoi indirizzi preferiti.")
                    .build()
            );
        }

        return new ListTemplate.Builder()
            .setSingleList(listBuilder.build())
            .setTitle("Chelona - Rubrica Indirizzi")
            .setHeaderAction(Action.APP_ICON)
            .build();
    }
}
