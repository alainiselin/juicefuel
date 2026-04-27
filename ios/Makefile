SCHEME ?= JuiceFuel
SIM ?= iPhone 16
DESTINATION = platform=iOS Simulator,name=$(SIM)
PROJECT = JuiceFuel.xcodeproj

.PHONY: gen build test run clean open sim-boot sim-shutdown help

help:
	@echo "Targets:"
	@echo "  make gen          Generate $(PROJECT) from project.yml"
	@echo "  make build        Build for $(SIM) simulator"
	@echo "  make test         Run unit tests"
	@echo "  make run          Build, install, and launch on $(SIM)"
	@echo "  make sim-boot     Boot the $(SIM) simulator"
	@echo "  make sim-shutdown Shut down all booted simulators"
	@echo "  make open         Open project in Xcode"
	@echo "  make clean        Remove generated project + DerivedData for this app"

gen:
	@xcodegen generate

build: gen
	@set -o pipefail && xcodebuild \
		-project $(PROJECT) \
		-scheme $(SCHEME) \
		-destination '$(DESTINATION)' \
		-configuration Debug \
		build | xcbeautify

test: gen
	@set -o pipefail && xcodebuild \
		-project $(PROJECT) \
		-scheme $(SCHEME) \
		-destination '$(DESTINATION)' \
		test | xcbeautify

sim-boot:
	@xcrun simctl boot "$(SIM)" 2>/dev/null || true
	@open "$$(xcode-select -p)/Applications/Simulator.app"

sim-shutdown:
	@xcrun simctl shutdown all

run: build sim-boot
	@APP_PATH=$$(xcodebuild -project $(PROJECT) -scheme $(SCHEME) -destination '$(DESTINATION)' -showBuildSettings 2>/dev/null | awk -F'= ' '/CONFIGURATION_BUILD_DIR/{d=$$2} /WRAPPER_NAME/{n=$$2} END{print d"/"n}') && \
		echo "Installing $$APP_PATH" && \
		xcrun simctl install booted "$$APP_PATH" && \
		xcrun simctl launch booted vip.juicecrew.juicefuel

open: gen
	@open $(PROJECT)

clean:
	@rm -rf $(PROJECT) build .build
	@rm -rf ~/Library/Developer/Xcode/DerivedData/JuiceFuel-*
