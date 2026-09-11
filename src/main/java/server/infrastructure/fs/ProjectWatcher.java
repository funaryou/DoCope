package server.infrastructure.fs;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.util.ArrayList;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;
import java.util.Map;
import java.util.List;

import org.springframework.stereotype.Component;

@Component 
public class ProjectWatcher {
    private final Map<Long, WatchService> watchers = new ConcurrentHashMap<>();
    private final Map<Long, List<WatchKey>> keys = new ConcurrentHashMap<>();


    public void watch(
        Long projectId,
        Path root
    ) throws IOException {
        WatchService watcher = root.getFileSystem().newWatchService();
        registerAll(projectId, watcher, root);
        watchers.put(projectId,watcher);
        Thread thread = new Thread(() -> loop(projectId,watcher));
        thread.setDaemon(true);
        thread.start();
    }

    private void loop(
        Long projectId,
        WatchService watcher
    ) {
        try {
            while (true) {
                WatchKey key;
                try {
                    key = watcher.take();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
                for (WatchEvent<?> event : key.pollEvents()) {
                    if (isExcluded(event)) {
                        continue;
                    }
                }
                if (!key.reset()) {
                    break;
                }
            }
        } finally {
            try {
                watcher.close();
            } catch (IOException ignore) {}
        }
    }

    private boolean isExcluded(WatchEvent<?> event) {
        String name = event.context().toString();
        return name.startsWith(".") || name.endsWith(".tmp") || name.endsWith(".swp");
    }

    private void registerAll(
        Long projectId,
        WatchService watcher,
        Path root
    ) throws IOException {
        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(Files::isDirectory).forEach(dir -> {
                try {
                    WatchKey key = dir.register(
                        watcher,
                        StandardWatchEventKinds.ENTRY_CREATE,
                        StandardWatchEventKinds.ENTRY_MODIFY,
                        StandardWatchEventKinds.ENTRY_DELETE
                    );
                    keys.computeIfAbsent(projectId, k -> new ArrayList<>()).add(key);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        }
    }

    public void unwatch(
        Long projectId
    ) throws IOException {
        List<WatchKey> list = keys.remove(projectId);
        if (list != null) {
            for (WatchKey key : list) {
                key.cancel();
            }
        }
        WatchService watcher = watchers.remove(projectId);
        if (watcher != null ) {
            watcher.close();
        }
    }
}
