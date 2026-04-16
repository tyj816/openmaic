# Requirements Document

## Introduction

This document specifies the requirements for implementing progressive generation in the teaching design system. Progressive generation allows users to view slides as they are being generated, rather than waiting for all slides to complete. This improves user experience by providing real-time feedback, enabling interruption and resumption of generation, and preventing loss of work if generation fails partway through.

## Glossary

- **Teaching Design System**: The conversational interface and generation pipeline that creates educational slide presentations based on user requirements
- **Progressive Generation**: A generation strategy where content is produced incrementally and made visible to users as each unit completes, rather than waiting for all units to finish
- **Slide**: A single page of educational content within a teaching design, containing a canvas with visual elements
- **Canvas**: The visual representation of a slide, containing elements like text, images, shapes, and layouts
- **Generation State**: The current status of the generation process (idle, generating, paused, completed, error)
- **Outline**: The planned structure of slides before their detailed content is generated
- **Completed Slide**: A slide that has finished generation and has a fully rendered canvas
- **Generating Slide**: A slide that is currently in the process of being generated
- **Skeleton Loader**: A placeholder UI component that indicates content is being generated
- **IndexedDB**: Browser-based persistent storage used to save generation progress
- **Generation Epoch**: A counter that increments when a new generation starts, used to detect and cancel outdated generation processes

## Requirements

### Requirement 1

**User Story:** As a teacher, I want to see slides as they are generated, so that I can review content immediately and provide early feedback without waiting for the entire presentation to complete.

#### Acceptance Criteria

1. WHEN the system generates teaching slides THEN the system SHALL display each completed slide immediately upon generation
2. WHEN a slide is being generated THEN the system SHALL display a skeleton loader placeholder for that slide
3. WHEN slides are displayed THEN the system SHALL show completed slides with full content and generating slides with loading indicators
4. WHEN the user views the slide list THEN the system SHALL display slides in order with their generation status visible
5. WHEN a slide completes generation THEN the system SHALL update the UI within 500 milliseconds to show the completed content

### Requirement 2

**User Story:** As a teacher, I want generation to continue from where it stopped if interrupted, so that I don't lose progress when my browser crashes or I need to close the page.

#### Acceptance Criteria

1. WHEN the system generates slides THEN the system SHALL persist each completed slide to IndexedDB immediately after generation
2. WHEN the user refreshes the page during generation THEN the system SHALL restore all completed slides from IndexedDB
3. WHEN generation is interrupted THEN the system SHALL calculate remaining slides by comparing the outline with completed slides
4. WHEN the user returns after interruption THEN the system SHALL offer to resume generation from the last completed slide
5. WHEN generation resumes THEN the system SHALL continue from the next incomplete slide in sequence

### Requirement 3

**User Story:** As a teacher, I want to retry individual failed slides, so that one failure doesn't require regenerating the entire presentation.

#### Acceptance Criteria

1. WHEN a slide generation fails THEN the system SHALL mark that slide with a failed status
2. WHEN a slide is marked as failed THEN the system SHALL display an error indicator and retry button for that slide
3. WHEN the user clicks retry on a failed slide THEN the system SHALL regenerate only that specific slide
4. WHEN a failed slide is retried successfully THEN the system SHALL replace the failed slide with the completed version
5. WHEN multiple slides fail THEN the system SHALL allow independent retry of each failed slide

### Requirement 4

**User Story:** As a teacher, I want to see real-time progress indicators, so that I understand how much work remains and can estimate completion time.

#### Acceptance Criteria

1. WHEN slides are generating THEN the system SHALL display a progress bar showing percentage complete
2. WHEN the progress updates THEN the system SHALL show the count of completed slides versus total slides
3. WHEN a slide is being generated THEN the system SHALL display a status message indicating which slide is currently generating
4. WHEN generation status changes THEN the system SHALL update all progress indicators within 500 milliseconds
5. WHEN all slides complete THEN the system SHALL display a completion message and hide progress indicators

### Requirement 5

**User Story:** As a teacher, I want to stop generation at any time, so that I can cancel if I realize the requirements were incorrect or I need to make changes.

#### Acceptance Criteria

1. WHEN generation is in progress THEN the system SHALL display a stop button
2. WHEN the user clicks stop THEN the system SHALL cancel the current slide generation within 2 seconds
3. WHEN generation is stopped THEN the system SHALL preserve all completed slides
4. WHEN generation is stopped THEN the system SHALL set the generation status to paused
5. WHEN generation is stopped THEN the system SHALL not continue generating additional slides

### Requirement 6

**User Story:** As a system architect, I want state management separated from UI components, so that the system is maintainable and testable.

#### Acceptance Criteria

1. WHEN the system manages generation state THEN the system SHALL use a dedicated Zustand store for teaching design state
2. WHEN components need generation state THEN the system SHALL access state through store selectors
3. WHEN state changes occur THEN the system SHALL notify all subscribed components automatically
4. WHEN the store is updated THEN the system SHALL trigger persistence operations asynchronously
5. WHEN multiple components access state THEN the system SHALL provide consistent state across all components

### Requirement 7

**User Story:** As a developer, I want generation to be serial rather than parallel, so that slides appear incrementally and the system can be interrupted cleanly.

#### Acceptance Criteria

1. WHEN the system generates slides THEN the system SHALL generate one slide at a time in sequence
2. WHEN a slide completes THEN the system SHALL add it to the store before starting the next slide
3. WHEN slides are generated serially THEN the system SHALL maintain the order specified in the outline
4. WHEN generation is interrupted THEN the system SHALL complete the current slide before stopping
5. WHEN the next slide starts THEN the system SHALL verify the generation epoch has not changed

### Requirement 8

**User Story:** As a teacher, I want to preview slides in a side panel, so that I can review content while generation continues without leaving the chat interface.

#### Acceptance Criteria

1. WHEN slides are being generated THEN the system SHALL display a preview panel on the right side of the screen
2. WHEN the preview panel is shown THEN the system SHALL display all completed slides with thumbnails
3. WHEN the preview panel is shown THEN the system SHALL display generating slides with skeleton loaders
4. WHEN a slide completes THEN the system SHALL update the preview panel to show the completed slide
5. WHEN the user scrolls the preview panel THEN the system SHALL maintain scroll position as new slides are added
