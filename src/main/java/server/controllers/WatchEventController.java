package server.controllers;


import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class WatchEventController {
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    @GetMapping("/events/{id}")
    public SseEmitter subscribe(
        @PathVariable Long id
    ) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(id, k -> new ArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(id,emitter));
        emitter.onTimeout(() -> remove(id,emitter));
        return emitter;
    }

    public void publish(
        Long projectId,
        String changedPath
    ) {
        List<SseEmitter> list = emitters.getOrDefault(projectId,List.of());
        for (SseEmitter emitter : new ArrayList<>(list)) {
            try {
                emitter.send(changedPath);
            } catch (Exception e) {
                remove(projectId,emitter);
            }
        }
    }

    private void remove(
        Long projectId,
        SseEmitter emitter
    ) {
        List<SseEmitter> list = emitters.get(projectId);
        if (list != null) {
            list.remove(emitter);
        }
    }
}
