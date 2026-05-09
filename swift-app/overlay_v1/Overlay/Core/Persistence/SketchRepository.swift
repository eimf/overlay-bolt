import Foundation
import SwiftUI

final class SketchRepository {
    static let shared = SketchRepository()

    private let store = SketchStore.shared

    private init() {}

    private var persistenceEnabled: Bool {
        UserDefaults.standard.object(forKey: PreferenceKeys.persistenceEnabled) as? Bool ?? true
    }

    @discardableResult
    func save(_ sketch: Sketch) -> Bool {
        guard persistenceEnabled else { return false }
        do {
            try store.save(sketch)
            return true
        } catch {
            print("SketchRepository.save failed: \(error)")
            return false
        }
    }

    func fetchAll() -> [Sketch] {
        guard persistenceEnabled else { return [] }
        do {
            return try store.fetchAll()
        } catch {
            print("SketchRepository.fetchAll failed: \(error)")
            return []
        }
    }

    func delete(id: UUID) {
        guard persistenceEnabled else { return }
        do {
            try store.delete(id: id)
        } catch {
            print("SketchRepository.delete failed: \(error)")
        }
    }
}
